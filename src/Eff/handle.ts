import { Eff } from './Eff.js'

export function handle<Y, R, Y2, R2>(handler: (gen: Iterator<Y, R>) => Eff<Y2, R2>) {
  return (eff: Eff<Y, R>): Eff<Y2, R2> => ({
    [Symbol.iterator]() {
      const gen = eff[Symbol.iterator]()
      const hgen = handler(gen)[Symbol.iterator]()
      const handled: Generator<Y2, R2> = {
        [Symbol.iterator]: () => handled,
        next(...args) {
          const r = hgen.next(...args)

          return r.done ? this.return(r.value) : r
        },
        throw(e) {
          if (hgen.throw) {
            return hgen.throw(e)
          }

          throw e
        },
        return(r) {
          gen.return(r as any)

          return { done: true, value: r }
        },
      }

      return handled
    },
  })
}
