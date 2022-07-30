import { Eff } from './Eff.js'
import { AddTrace } from './Trace.js'

import { Trace } from '@/Fx/Trace/index.js'

export class Access<R, Y, R2> extends Eff.Instruction<(resources: R) => Eff<Y, R2>, R2> {
  readonly tag = 'Access'
}

export function access<R, Y, R2>(
  f: (resources: R) => Eff<Y, R2>,
  __trace?: string,
): Eff<Y | Access<R, Y, R2>, R2> {
  return new Access(f, __trace)
}

export function provide<R2>(resources: R2) {
  return <Y, R>(
    eff: Eff<Y | Access<R2, any, any>, R>,
  ): Eff<Exclude<Y, Access<R2, any, any>> | AddTrace, R> =>
    Eff(function* () {
      const gen = eff[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        const instr = result.value

        if (instr instanceof Access<R2, any, any>) {
          if (instr.__trace) {
            yield* new AddTrace(Trace.custom(instr.__trace))
          }

          result = gen.next(yield* instr.input(resources))
        } else {
          result = gen.next(yield instr)
        }
      }

      return result.value
    })
}
