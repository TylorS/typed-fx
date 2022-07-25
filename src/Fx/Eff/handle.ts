import { Eff } from './Eff'

export function handle<Y, Y2, R2, N, R, Y3 = never, R3 = R, N2 = never>(
  onInstruction: (instr: Y) => Eff<Y2, R2, N>,
  onReturn?: (r: R) => Eff<Y3, R3, N2>,
) {
  return (sync: Eff<Y, R, R2>): Eff<Y2 | Y3, R3, N | N2> =>
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
