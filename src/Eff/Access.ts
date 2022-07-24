import { Eff } from './Eff'

export class Access<R, Y, R2, N> implements Eff<Y | Access<R, Y, R2, N>, R2, N | R2> {
  readonly tag = 'Access'
  constructor(readonly access: (resources: R) => Eff<Y, R2, N>) {}

  *[Symbol.iterator]() {
    return (yield this as Access<R, Y, R2, N>) as R2
  }
}

export function access<R, Y, R2, N>(
  f: (resources: R) => Eff<Y, R2, N>,
): Eff<Y | Access<R, Y, R2, N>, R2, R2 | N> {
  return new Access(f)
}

export function provide<R2>(resources: R2) {
  return <Y, R, N>(
    eff: Eff<Y | Access<R2, any, any, any>, R, N>,
  ): Eff<Exclude<Y, Access<R2, any, any, any>>, R, R2 | N> =>
    Eff(function* () {
      const gen = eff[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        const instr = result.value

        if (instr instanceof Access<R2, any, any, any>) {
          result = gen.next(yield* instr.access(resources))
        } else {
          result = gen.next((yield instr) as Exclude<N, R2>)
        }
      }

      return result.value
    })
}
