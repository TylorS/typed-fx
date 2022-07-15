import { Fx } from './Fx'
import { GetFiberContext } from './InstructionSet/GetFiberContext'
import { AnyInstruction } from './InstructionSet/Instruction'

import { FiberContext } from '@/FiberContext/index'

export const withinContext =
  (context: FiberContext) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    Fx(function* () {
      const gen = fx[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        const instr = result.value as AnyInstruction

        if (instr.is(GetFiberContext)) {
          result = gen.next(context)
        } else {
          result = gen.next(yield instr)
        }
      }

      return result.value
    })
