import { Lazy } from 'hkt-ts'

/**
 * Eff is a very thin abstraction over Generators which provides a synchronous, algebraic-effects-like,
 * way to represent effects.
 */
export interface Eff<Y, R, N = unknown> {
  readonly [Symbol.iterator]: () => Generator<Y, R, N>
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type YieldOf<T> = T extends Eff<infer _R, infer _E, infer _A> ? _R : never
export type ReturnOf<T> = T extends Eff<infer _R, infer _E, infer _A> ? _E : never
export type NextOf<T> = T extends Eff<infer _R, infer _E, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export function Eff<Y, R, N>(f: () => Generator<Y, R, N>): Eff<Y, R, N> {
  return {
    [Symbol.iterator]: f,
  }
}

export function handle<Y, Y2, R2, N, R, Y3 = never, R3 = R, N2 = never>(
  onInstruction: (instr: Y) => Eff<Y2, R2, N>,
  onReturn: (r: R) => Eff<Y3, R3, N2> = fromValue as any,
) {
  return (sync: Eff<Y, R, R2>): Eff<Y2 | Y3, R3, N | N2> =>
    Eff(function* () {
      const gen = sync[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        result = gen.next(yield* onInstruction(result.value))
      }

      return yield* onReturn(result.value)
    })
}

export function fromValue<A>(value: A) {
  // eslint-disable-next-line require-yield
  return Eff(function* () {
    return value
  })
}

export function fromLazy<A>(f: Lazy<A>) {
  // eslint-disable-next-line require-yield
  return Eff(function* () {
    return f()
  })
}

/**
 * Once all yields are provided you can run an Eff synchronously
 */
export function runEff<R, N>(eff: Eff<never, R, N>) {
  return eff[Symbol.iterator]().next().value
}
