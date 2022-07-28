/**
 * Eff is a very thin abstraction over Generators which provides a synchronous, algebraic-effects-like,
 * way to represent effects.
 */
export interface Eff<Y, R> {
  readonly [Symbol.iterator]: () => Generator<Y, R, any>
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type YieldOf<T> = T extends Eff<infer _Y, infer _A> ? _Y : never
export type ReturnOf<T> = T extends Eff<infer _Y, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export function Eff<Y, R>(f: () => Generator<Y, R>): Eff<Y, R> {
  return {
    [Symbol.iterator]: f,
  }
}

export namespace Eff {
  export class Instruction<I, O> {
    readonly __RESOURCES__: unknown
    readonly __ERRORS__: unknown

    constructor(readonly input: I, readonly __trace?: string) {}

    *[Symbol.iterator](): Generator<this, O> {
      return (yield this) as O
    }
  }
}

/**
 * Once all yields are provided you can run an Eff synchronously
 */
export function runEff<R>(eff: Eff<never, R>) {
  const result = eff[Symbol.iterator]().next()

  if (!result.done) {
    throw new Error(`Unknown instruction encountered: ${JSON.stringify(result.value, null, 2)}`)
  }

  return result.value
}
