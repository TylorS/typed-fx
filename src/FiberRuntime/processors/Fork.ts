import { Just } from 'hkt-ts/Maybe'

import { GetCurrentFiberContext, GetEnvironment } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'
import { FiberRuntime, FiberRuntimeParams } from '../index'

import { Env } from '@/Env/Env'
import { Fiber, LiveFiber } from '@/Fiber/Fiber'
import { FiberContext } from '@/FiberContext/index'
import { FiberId } from '@/FiberId/FiberId'
import { wait } from '@/Future/wait'
import { Fx } from '@/Fx/Fx'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { Fork, ForkParams, fromLazy } from '@/Fx/index'
import { acquire } from '@/Semaphore/Semaphore'
import { None } from '@/Supervisor/None'

export function* processFork<R, E, A>(
  instr: Fork<R, E, A>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
): RuntimeIterable<E, Fiber<E, A>> {
  const [fx, options] = instr.input
  const runtime = yield* forkFiberRuntime(fx, options, toRuntimeIterable)

  Promise.resolve().then(() => runtime.start())

  return fromFiberRuntime(runtime)
}

export function* forkFiberRuntime<R, E, A>(
  fx: Fx<R, E, A>,
  options: ForkParams<R>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
) {
  const context: FiberContext = yield new GetCurrentFiberContext()
  const env: Env<R> = yield new GetEnvironment()
  const fiberId = FiberId(
    context.platform.sequenceNumber.increment,
    context.scheduler.currentTime(),
  )
  const params: FiberRuntimeParams<R> = {
    fiberId,
    env,
    scheduler: context.scheduler,
    supervisor: None,
    fiberRefs: options.fiberRefs ?? (yield* toRuntimeIterable(context.fiberRefs.fork)),
    scope: options.scope ?? (yield* toRuntimeIterable(context.scope.fork)),
    platform: context.platform,
    parent: Just(context),
    ...options,
  }

  return new FiberRuntime(acquire(context.semaphore)(fx), params)
}

export function fromFiberRuntime<R, E, A>(runtime: FiberRuntime<R, E, A>): LiveFiber<E, A> {
  return new LiveFiber(
    runtime.params.fiberId,
    fromLazy(() => runtime.context),
    fromLazy(() => runtime.stackTrace),
    wait(runtime.exit),
    Fx(function* () {
      const { fiberRefs } = yield* getFiberContext

      yield* fiberRefs.join(runtime.context.fiberRefs)
    }),
    runtime.interrupt,
  )
}
