import { Either, pipe } from 'hkt-ts'
import { makeAssociative } from 'hkt-ts/Array'
import { isLeft } from 'hkt-ts/Either'
import { Just } from 'hkt-ts/Maybe'
import { Exit, makeParallelAssociative } from '../Exit/Exit.js'
import { FiberContext } from '../FiberContext/FiberContext.js'
import { FiberId } from '../FiberId/FiberId.js'
import { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { complete } from '../Future/complete.js'
import { pending } from '../Future/Future.js'
import { wait } from '../Future/wait.js'
import { Instruction } from '../Fx/Instruction/Instruction.js'
import { Fx, AnyFx, success, zipAll } from '../index.js'
import { Platform } from '../Platform/Platform.js'
import { Closeable } from '../Scope/Closeable.js'
import { acquire, Semaphore } from '../Semaphore/Semaphore.js'
import { FiberRuntime, make, toFiber } from './FiberRuntime.js'

import { RuntimeFiberContext } from './RuntimeFiberContext.js'
import {
  PopContext,
  PushContext,
  PushInstruction,
  RuntimeAsync,
  RuntimeIterable,
  RuntimePromise,
  ScheduleCallback,
} from './RuntimeInstruction.js'

// eslint-disable-next-line require-yield
export function* fxInstructionToRuntimeInstruction<R, E>(
  instr: Instruction<R, E, any>,
  runtimeCtx: RuntimeFiberContext,
  ctx: FiberContext,
  scope: Closeable,
  platform: Platform,
): RuntimeIterable<RuntimeFiberContext, AnyFx, E, any> {
  // Yield to other fibers cooperatively
  if (runtimeCtx.instructionCount === platform.maxOpCount) {
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
      const fiberRefs: FiberRefs = params?.fiberRefs ?? (yield new PushInstruction(ctx.fiberRefs.fork))
      const runtime = make(
        acquire(runtimeCtx.concurrencyLevel)(fx),
        runtimeCtx.env,
        forkFiberContext(toFiberContext(runtimeCtx, { ...ctx, ...params }), fiberRefs, platform),
        params?.forkScope?.fork() ?? scope.fork(),
        platform,
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
          forkFiberContext(toFiberContext(runtimeCtx, ctx), ctx.fiberRefs, platform),
          scope.fork(),
          platform,
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

function forkFiberContext(
  ctx: FiberContext,
  fiberRefs: FiberRefs,
  platform: Platform,
): FiberContext {
  const scheduler = ctx.scheduler.fork()

  return {
    ...ctx,
    id: new FiberId.Live(
      platform.sequenceNumber.increment,
      ctx.scheduler,
      ctx.scheduler.getCurrentTime(),
    ),
    fiberRefs,
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
