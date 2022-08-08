import { Either } from 'hkt-ts'
import { makeAssociative } from 'hkt-ts/Array'
import { isLeft } from 'hkt-ts/Either'
import { Just, Maybe } from 'hkt-ts/Maybe'

import { Env } from '../Env/Env.js'
import * as FiberContext from '../FiberContext/FiberContext.js'
import { complete, pending, wait } from '../Future/Future.js'
import { Fx, Of, fromExit, fromLazy, success, zipAll } from '../Fx/Fx.js'
import { ForkParams } from '../Fx/Instructions/Fork.js'
import * as FxInstruction from '../Fx/Instructions/Instruction.js'
import * as Closeable from '../Scope/Closeable.js'
import { Semaphore } from '../Semaphore/Semaphore.js'

import { Live } from './Fiber.js'

import { increment } from '@/Atomic/AtomicCounter.js'
import { Disposable } from '@/Disposable/Disposable.js'
import { Heap, HeapKey } from '@/Eff/Process/Heap.js'
import { PushInstruction } from '@/Eff/Process/Instruction.js'
import { Process } from '@/Eff/Process/Process.js'
import { ProcessorEff } from '@/Eff/Process/ProcessorEff.js'
import { Future, ensuring, getTrace } from '@/Eff/index.js'
import { Exit, interrupt, makeParallelAssociative } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { FiberStatus } from '@/FiberStatus/index.js'
import * as Platform from '@/Platform/Platform.js'
import { Delay } from '@/Time/index.js'
import { Trace } from '@/Trace/Trace.js'

const EnvKey = HeapKey<Env<any>>('Env')
const FiberContextKey = HeapKey<FiberContext.FiberContext>('FiberContext')
const FiberScopeKey = HeapKey<Closeable.Closeable>('FiberScope')
const ConcurrencyLevelKey = HeapKey<Semaphore>('ConcurrencyLevel')

function initializeHeap<R>(
  env: Env<R>,
  context: FiberContext.FiberContext,
  scope: Closeable.Closeable,
) {
  const heap = new Heap()

  heap.set(EnvKey, env)
  heap.set(FiberContextKey, context)
  heap.set(FiberScopeKey, scope)
  heap.set(ConcurrencyLevelKey, new Semaphore(context.concurrencyLevel))

  return heap
}

export class FiberRuntime<R, E, A> {
  protected readonly process: Process<FxInstruction.Instruction<R, E, any>, A>

  get status(): FiberStatus {
    return this.process.status
  }

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly id: FiberId.Live,
    readonly env: Env<R>,
    readonly context: FiberContext.FiberContext,
    readonly scope: Closeable.Closeable,
    readonly trace: Maybe<Trace>,
  ) {
    this.process = new Process<FxInstruction.Instruction<R, E, any>, A>(
      ensuring(closeOrWaitForScope(scope))(fx),
      {
        heap: initializeHeap(env, context, scope),
        platform: Platform.fork(context.platform),
        trace,
      },
      processFxInstruction(() => this.status.isInterruptable),
    )

    // Ensure that when this Scope closes, the process will attempt to be closed as well
    scope.ensuring((exit) => (isLeft(exit) ? this.process.runEff(fromExit(exit)) : success(null)))
  }

  readonly start = (): boolean => this.process.start()

  readonly addObserver = (observer: (exit: Exit<E, A>) => void): Disposable =>
    this.process.addObserver(observer)

  readonly interrupt = (id: FiberId): Of<Exit<E, A>> =>
    closeOrWaitForScope(this.scope)(interrupt(id))
}

export function processFxInstruction(getInterruptStatus: () => boolean) {
  return <R, E>(
    instr: FxInstruction.Instruction<R, E, any>,
    heap: Heap,
    platform: Platform.Platform,
  ) => {
    return ProcessorEff<FxInstruction.Instruction<R, E, any>, any>(function* () {
      switch (instr.tag) {
        case 'Access': {
          return yield* new PushInstruction(instr.input(heap.getOrThrow(EnvKey)))
        }
        case 'Fork': {
          const [fx, params] = instr.input

          // TODO: WHY DOES SEMAPHORE BLOW EVERYTHING UP?
          // const semaphore = heap.getOrThrow(ConcurrencyLevelKey)
          const runtime: FiberRuntime<any, any, any> = yield* forkNewRuntime(
            fx,
            params,
            heap,
            getInterruptStatus(),
          )
          const fiber = fromFiberRuntime(runtime)

          // Asynchronously start the Fiber
          setTimer(platform, heap, () => runtime.start())

          return fiber
        }
        case 'GetFiberContext': {
          return getCurrentContext(heap, getInterruptStatus())
        }
        case 'GetFiberScope': {
          return heap.getOrThrow(FiberScopeKey)
        }
        case 'Provide': {
          const [fx, env] = instr.input
          const currentEnv = heap.getOrThrow(EnvKey)

          heap.set(EnvKey, env) // Update the Heap with the new Env
          const a: any = yield* new PushInstruction(fx) // Run the Fx
          heap.set(EnvKey, currentEnv) // Reset the Env back to what it was

          return a
        }
        case 'WithConcurrency': {
          const [fx, level] = instr.input
          const currentSemaphore = heap.getOrThrow(ConcurrencyLevelKey)

          heap.set(ConcurrencyLevelKey, new Semaphore(level)) // Update the Heap with the new Env
          const a: any = yield* new PushInstruction(fx) // Run the Fx
          heap.set(ConcurrencyLevelKey, currentSemaphore) // Reset the Env back to what it was

          return a
        }
        case 'ZipAll': {
          const fxs = instr.input

          // Fast-path for empty array
          if (fxs.length === 0) {
            return []
          }

          // Fast-path for array with 1 value
          if (fxs.length === 1) {
            return [yield* new PushInstruction(fxs[0])]
          }

          // Allow for Concurrency.
          // TODO: WHY DOES SEMAPHORE BLOW EVERYTHING UP?
          // const semaphore = heap.getOrThrow(ConcurrencyLevelKey)
          const runtimes: FiberRuntime<any, any, any>[] = []
          for (const fx of fxs) {
            runtimes.push(yield* forkNewRuntime(fx, undefined, heap, getInterruptStatus()))
          }

          const [future, onExit] = zipAllFuture<R, E>(runtimes)

          runtimes.forEach((r, i) => r.addObserver((e) => onExit(e, i)))

          // Asynchronously start the Runtimes
          setTimer(platform, heap, () => runtimes.forEach((r) => r.start()))

          return yield* new PushInstruction(wait(future))
        }
        // Process understands a lot of our Instructions by default, only handle the Fx-specific instructions above.
        default:
          return yield instr
      }
    })
  }
}

export function fromFiberRuntime<R, E, A>(runtime: FiberRuntime<R, E, A>): Live<E, A> {
  const exit = pending<never, never, Exit<E, A>>()

  runtime.addObserver((e) => Future.complete(exit)(success(e)))

  return {
    tag: 'Live',
    id: runtime.id,
    status: fromLazy(() => runtime.status),
    context: success(runtime.context),
    scope: success(runtime.scope),
    exit: Future.wait(exit),
  }
}

// Internals

// Set timer and track those resources.
const setTimer = (platform: Platform.Platform, heap: Heap, f: () => void) => {
  const disposable = platform.timer.setTimer(f, Delay(0))
  heap.getOrThrow(FiberScopeKey).ensuring(() => fromLazy(() => disposable.dispose()))
}

const getCurrentContext = (heap: Heap, interruptStatus: boolean) => {
  const current = heap.getOrThrow(FiberContextKey)
  const concurrencyLevel = heap.getOrThrow(ConcurrencyLevelKey)
  const context: FiberContext.FiberContext = {
    ...current,
    concurrencyLevel: concurrencyLevel.maxPermits,
    interruptStatus,
  }

  return context
}

const forkNewRuntime = function* <R, E, A>(
  fx: Fx<R, E, A>,
  params: ForkParams | undefined,
  heap: Heap,
  interruptStatus: boolean,
) {
  // Fork the FiberContext
  const currentContext = getCurrentContext(heap, interruptStatus)
  const context: FiberContext.FiberContext = FiberContext.fork(currentContext, params)

  const scope = params?.forkScope?.fork() ?? heap.getOrThrow(FiberScopeKey).fork()
  const id = new FiberId.Live(
    increment(currentContext.platform.sequenceNumber),
    currentContext.platform.timer,
    currentContext.platform.timer.getCurrentTime(),
  )

  return new FiberRuntime(fx, id, heap.getOrThrow(EnvKey), context, scope, Just(yield* getTrace))
}

const getFinalExit = <E>(exits: ReadonlyArray<Exit<E, readonly any[]>>) => {
  return exits.reduce(makeParallelAssociative<any, any>(makeAssociative()).concat)
}

const zipAllFuture = <R, E>(runtimes: FiberRuntime<R, E, any>[]) => {
  const expected = runtimes.length
  const future = pending<never, E, readonly any[]>()
  const exits: Array<Exit<E, readonly any[]>> = Array(expected)

  let i = 0

  const onExit = (exit: Exit<E, any>, index: number) => {
    if (future.state.get().tag === 'Resolved') {
      return
    }

    exits[index] = Either.tupled(exit)

    // If we've Failed, lets interrupt all the other Runtimes.
    // If the Runtime has already exited, it's return value will return synchronously.
    if (isLeft(exit)) {
      const failed = runtimes[index]

      return complete(future)(
        Fx(function* () {
          return yield* fromExit(
            getFinalExit<E>(
              yield* zipAll(
                runtimes.map((r) =>
                  Fx(function* () {
                    return Either.tupled(yield* r.interrupt(failed.id))
                  }),
                ),
              ),
            ),
          )
        }),
      )
    }

    // If we've collected all our values, lets continue
    if (i++ === expected) {
      complete(future)(fromExit(getFinalExit(exits)))
    }
  }

  return [future, onExit] as const
}

function closeOrWaitForScope(scope: Closeable.Closeable) {
  return (exit: Exit<any, any>) =>
    Fx(function* () {
      const released = yield* scope.close(exit)

      if (released) {
        return Closeable.getExit(scope)
      }

      return yield* Closeable.wait(scope)
    })
}
