import { isLeft } from 'hkt-ts/Either'

import { Fail } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'

import { FromExit } from '@/Fx/InstructionSet/FromExit'

export function* processFromExit<E, A>(instr: FromExit<E, A>): RuntimeIterable<E, A> {
  const exit = instr.input

  if (isLeft(exit)) {
    return (yield new Fail(exit.left)) as never
  }

  return exit.right
}
