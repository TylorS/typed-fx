import { PopConcurrencyLevel, PushConcurrencyLevel } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'

import { Fx } from '@/Fx/Fx'
import { WithConcurrency } from '@/Fx/InstructionSet/WithConcurrency'

export function* processWithConcurrency<R, E, A>(
  instr: WithConcurrency<Fx<R, E, A>>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
): RuntimeIterable<E, A> {
  const [fx, concurrencyLevel] = instr.input

  yield new PushConcurrencyLevel(concurrencyLevel)

  const a = yield* toRuntimeIterable(fx)

  yield new PopConcurrencyLevel()

  return a
}
