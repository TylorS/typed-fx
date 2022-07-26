import { Eff } from './Eff.js'
import { AddTrace } from './Trace.js'

import { Trace } from '@/Fx/Trace/index.js'

export class Access<R, Y, R2, N> extends Eff.Instruction<
  (resources: R) => Eff<Y, R2, N>,
  R2,
  N | R2
> {}

export function access<R, Y, R2, N>(
  f: (resources: R) => Eff<Y, R2, N>,
  __trace?: string,
): Eff<Y | Access<R, Y, R2, N>, R2, R2 | N> {
  return new Access(f, __trace)
}

export function provide<R2>(resources: R2) {
  return <Y, R, N>(
    eff: Eff<Y | Access<R2, any, any, any>, R, N>,
  ): Eff<Exclude<Y, Access<R2, any, any, any>> | AddTrace, R, R2 | N> =>
    Eff(function* () {
      const gen = eff[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        const instr = result.value

        if (instr instanceof Access<R2, any, any, any>) {
          if (instr.__trace) {
            yield* new AddTrace(Trace.custom(instr.__trace))
          }

          result = gen.next(yield* instr.input(resources))
        } else {
          result = gen.next((yield instr as any) as N)
        }
      }

      return result.value
    })
}
