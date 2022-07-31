import { Either, pipe } from 'hkt-ts'
import { makeAssociative } from 'hkt-ts/Array'
import { isLeft } from 'hkt-ts/Either'
import { Just } from 'hkt-ts/Maybe'
import { isNonEmpty } from 'hkt-ts/NonEmptyArray'

import { interrupted, makeSequentialAssociative } from '../Cause/Cause.js'
import { Failure } from '../Eff/Failure.js'
import { Exit, makeParallelAssociative } from '../Exit/Exit.js'
import { FiberContext } from '../FiberContext/FiberContext.js'
import { FiberId } from '../FiberId/FiberId.js'
import { pending } from '../Future/Future.js'
import { complete } from '../Future/complete.js'
import { wait } from '../Future/wait.js'
import { AnyFx, Fx, success } from '../Fx/Fx.js'
import { Instruction } from '../Fx/Instruction/Instruction.js'
import { zipAll } from '../Fx/Instruction/ZipAll.js'
import { Closeable } from '../Scope/Closeable.js'
import { Semaphore, acquire } from '../Semaphore/Semaphore.js'

// eslint-disable-next-line import/no-cycle
import { FiberRuntime, make, toFiber } from './FiberRuntime.js'
import { RuntimeFiberContext } from './RuntimeFiberContext.js'
import {
  GetContext,
  PopContext,
  PushContext,
  PushInstruction,
  RuntimeAsync,
  RuntimeIterable,
  RuntimePromise,
  ScheduleCallback,
} from './RuntimeInstruction.js'

const { concat: concatSeq } = makeSequentialAssociative<never>()

// eslint-disable-next-line require-yield
export function* fxInstructionToRuntimeInstruction<R, E>(
  instr: Instruction<R, E, any>,
  runtimeCtx: RuntimeFiberContext,
  interruptedBy: ReadonlyArray<FiberId>,
  ctx: FiberContext,
  scope: Closeable,
): RuntimeIterable<RuntimeFiberContext, AnyFx, E, any> {
  // Yield to other fibers cooperatively
  if (runtimeCtx.instructionCount === ctx.platform.maxOpCount) {
    yield new PushContext({ ...runtimeCtx, instructionCount: 0 })
    yield new RuntimePromise(() => Promise.resolve())
  }

  switch (instr.tag) {
    case 'Access':
      return yield new PushInstruction(instr.input(runtimeCtx.env))
    case 'Provide': {
      const [fx, env] = instr.input

      yield new PushContext({ ...runtimeCtx, env })

      return yield new PushInstruction(fx)
    }
    case 'AddTrace': {
      return yield new PushContext({ ...runtimeCtx, trace: runtimeCtx.trace.push(instr.trace) })
    }
    case 'Async': {
      return yield new RuntimeAsync((cb) => instr.input((fx) => cb(fx)))
    }
    case 'Failure': {
      return yield instr
    }
    case 'Fork': {
      const [fx, params] = instr.input
      const runtime = make(
        acquire(runtimeCtx.concurrencyLevel)(fx),
        runtimeCtx.env,
        forkFiberContext(toFiberContext(runtimeCtx, { ...ctx, ...params })),
        params?.forkScope?.fork() ?? scope.fork(),
      )

      yield new ScheduleCallback(() => runtime.start())

      return toFiber(runtime)
    }
    case 'FromLazy': {
      return instr.input()
    }
    case 'GetFiberContext': {
      return toFiberContext(runtimeCtx, ctx)
    }
    case 'GetTrace': {
      return runtimeCtx.trace.flatten()
    }
    case 'SetInterruptStatus': {
      const [fx, status] = instr.input

      yield new PushContext({ ...runtimeCtx, interruptStatus: status })

      const a = yield new PushInstruction(fx)

      yield new PopContext()

      const updated: RuntimeFiberContext = yield new GetContext()

      // If things are no interruptable, exit with interrupted Fibers.
      if (updated.interruptStatus && isNonEmpty(interruptedBy)) {
        // Fold all interrupted Ids into one Cause.
        return yield new Failure(interruptedBy.map(interrupted).reduce(concatSeq))
      }

      return a
    }
    case 'WithConcurrency': {
      const [fx, level] = instr.input

      yield new PushContext({ ...runtimeCtx, concurrencyLevel: new Semaphore(level) })

      const a = yield new PushInstruction(fx)

      yield new PopContext()

      return a
    }
    case 'ZipAll': {
      if (instr.input.length === 0) {
        return []
      }

      const runtimes = instr.input.map((fx) =>
        make(
          acquire(runtimeCtx.concurrencyLevel)(fx),
          runtimeCtx.env,
          forkFiberContext(toFiberContext(runtimeCtx, ctx)),
          scope.fork(),
        ),
      )

      const [fx, onExit] = zipAllFuture(runtimes)

      // Add all our observers
      runtimes.forEach((r, i) => r.addObserver((exit) => onExit(exit, i)))

      yield new ScheduleCallback(() => runtimes.forEach((r) => r.start()))

      return yield new PushInstruction(fx)
    }
  }
}

function toFiberContext(runtimeCtx: RuntimeFiberContext, ctx: FiberContext): FiberContext {
  return {
    ...ctx,
    trace: runtimeCtx.trace.flatten(),
    concurrencyLevel: runtimeCtx.concurrencyLevel.maxPermits,
    interruptStatus: runtimeCtx.interruptStatus,
  }
}

export function forkFiberContext(ctx: FiberContext): FiberContext {
  const scheduler = ctx.scheduler.fork()

  return {
    ...ctx,
    id: new FiberId.Live(
      ctx.platform.sequenceNumber.increment,
      ctx.scheduler,
      ctx.scheduler.getCurrentTime(),
    ),
    fiberRefs: ctx.fiberRefs.fork(),
    scheduler,
    parent: Just(ctx),
  }
}

const { concat: concatPar } = makeParallelAssociative(makeAssociative<any>())

function zipAllFuture<E, A>(runtimes: Array<FiberRuntime<any, E, A>>) {
  const future = pending<Exit<E, A>>()
  const exits = Array(runtimes.length)

  let remaining = runtimes.length
  return [
    wait(future),
    (exit: Exit<E, any>, index: number) => {
      exits[index] = pipe(
        exit,
        Either.map((a) => [a]),
      )

      if (isLeft(exit)) {
        return complete(future)(
          Fx(function* () {
            runtimes.splice(index, 1)

            yield* zipAll(runtimes.map((r) => r.interrupt(FiberId.None)))

            return exit as Exit<E, A>
          }),
        )
      }

      if (--remaining === 0) {
        return complete(future)(success(exits.reduce(concatPar)))
      }
    },
  ] as const
}
