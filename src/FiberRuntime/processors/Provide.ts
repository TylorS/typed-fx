import { PopEnvironment, PushEnvironment } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'

import { Fx } from '@/Fx/Fx'
import { Provide } from '@/Fx/InstructionSet/Provide'

export function* processProvide<R, E, A>(
  instr: Provide<R, E, A>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
): RuntimeIterable<E, A> {
  const [fx, env] = instr.input

  yield new PushEnvironment(env)

  const a = yield* toRuntimeIterable(fx)

  yield new PopEnvironment()

  return a
}
