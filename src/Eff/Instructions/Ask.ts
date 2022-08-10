import { pipe } from 'hkt-ts/function'

import { Eff } from '../Eff.js'
import { handle } from '../handle.js'

export class Ask<R> extends Eff.Instruction<void, R> {
  static tag = 'Ask'
}

export const ask = <R>(): Eff<Ask<R>, R> => new Ask<R>()

export const asks = <R, A>(f: (r: R) => A): Eff<Ask<R>, A> =>
  Eff(function* () {
    return f(yield* ask<R>())
  })

export const access = <R, Y, A>(f: (r: R) => Eff<Y, A>): Eff<Y | Ask<R>, A> =>
  Eff(function* () {
    return yield* f(yield* ask<R>())
  })

export const provide =
  <R>(resources: R) =>
  <Y, R2>(eff: Eff<Y | Ask<R>, R2>): Eff<Exclude<Y, Ask<R>>, R2> =>
    pipe(
      eff,
      handle(function* (gen, result) {
        while (!result.done) {
          const instr = result.value

          if (instr instanceof Ask<R>) {
            result = gen.next(resources)
          } else {
            result = gen.next(yield instr as Exclude<Y, Ask<R>>)
          }
        }

        return result.value
      }),
    )
