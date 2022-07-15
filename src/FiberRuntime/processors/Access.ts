import { GetEnvironment } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'

import { Env } from '@/Env/Env'
import { Fx } from '@/Fx/Fx'
import { Access } from '@/Fx/InstructionSet/Access'

export function* processAccess<R, R2, E, A>(
  instr: Access<R, R2, E, A>,
  toRuntimeIterable: <A>(fx: Fx<R | R2, E, A>) => RuntimeIterable<E, A>,
): RuntimeIterable<E, A> {
  const env: Env<R> = yield new GetEnvironment()

  return yield* toRuntimeIterable(instr.input(env))
}
