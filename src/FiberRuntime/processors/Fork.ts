import { GetCurrentFiberContext } from '../RuntimeInstruction'
import type { RuntimeIterable } from '../RuntimeIterable'

import { forkFiberRuntime, fromFiberRuntime } from './forkFiberRuntime'

import type { Fiber } from '@/Fiber/Fiber'
import { FiberContext } from '@/FiberContext/index'
import type { Fx } from '@/Fx/Fx'
import type { Fork } from '@/Fx/InstructionSet/Fork'
import { fromLazy } from '@/Fx/lazy'
import { Delay } from '@/Timer/Timer'

export function* processFork<R, E, A>(
  instr: Fork<R, E, A>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
): RuntimeIterable<E, Fiber<E, A>> {
  const [fx, options] = instr.input
  const context: FiberContext = yield new GetCurrentFiberContext()
  const runtime = yield* forkFiberRuntime(fx, options, toRuntimeIterable)
  const cleanup = context.scheduler.timer.setTimer(runtime.start, Delay(0))

  context.scope.ensuring(fromLazy(cleanup))

  return fromFiberRuntime(runtime)
}
