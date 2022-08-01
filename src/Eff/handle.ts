import { Eff } from './Eff.js'

export function handle<Y, Y2, R2, R, Y3 = never, R3 = R2>(
  onInstruction: (instr: Y) => Eff<Y2, R2>,
  onReturn?: (r: R) => Eff<Y3, R3>,
) {
  return (sync: Eff<Y, R>): Eff<Y2 | Y3, R3> =>
    Eff(function* () {
      const gen = sync[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        result = gen.next(yield* onInstruction(result.value))
      }

      if (onReturn) {
        return yield* onReturn(result.value)
      }

      return result.value as any as R3
    })
}
