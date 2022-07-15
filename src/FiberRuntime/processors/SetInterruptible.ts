import { PopInterruptStatus, PushInterruptStatus } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'

import { Fx } from '@/Fx/Fx'
import { SetInterruptible } from '@/Fx/InstructionSet/SetInterruptable'

export function* processSetInterruptible<R, E, A>(
  instr: SetInterruptible<Fx<R, E, A>>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
): RuntimeIterable<E, A> {
  const [fx, interruptible] = instr.input

  yield new PushInterruptStatus(interruptible)

  const a = yield* toRuntimeIterable(fx)

  yield new PopInterruptStatus()

  return a
}
