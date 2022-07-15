import type { RuntimeIterable } from '../RuntimeIterable'

// eslint-disable-next-line import/no-cycle
import { forkFiberRuntime, fromFiberRuntime } from './forkFiberRuntime'

import { Fiber } from '@/Fiber/Fiber'
import { Fx } from '@/Fx/Fx'
import { Fork } from '@/Fx/index'

export function* processFork<R, E, A>(
  instr: Fork<R, E, A>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
): RuntimeIterable<E, Fiber<E, A>> {
  const [fx, options] = instr.input
  const runtime = yield* forkFiberRuntime(fx, options, toRuntimeIterable)

  Promise.resolve().then(() => runtime.start())

  return fromFiberRuntime(runtime)
}
