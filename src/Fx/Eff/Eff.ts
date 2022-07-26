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

export namespace Eff {
  export class Instruction<I, R, N> implements Eff<Instruction<I, R, N>, R, R> {
    constructor(readonly input: I, readonly __trace?: string) {}

    *[Symbol.iterator]() {
      return (yield this) as R
    }
  }
}

/**
 * Once all yields are provided you can run an Eff synchronously
 */
export function runEff<R, N>(eff: Eff<never, R, N>) {
  return eff[Symbol.iterator]().next().value
}
