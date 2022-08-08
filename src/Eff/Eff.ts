import { Lazy } from 'hkt-ts/function'

/**
 * Eff is a very thin abstraction over Generators which provides a way to
 * construct Effects that are interpreted.
 */
export interface Eff<Y, R> {
  readonly [Symbol.iterator]: () => Generator<Y, R, any>
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type YieldOf<T> = T extends Eff<infer _Y, infer _A> ? _Y : never
export type ReturnOf<T> = T extends Eff<infer _Y, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export function Eff<Y = never, R = unknown>(f: () => Generator<Y, R>): Eff<Y, R> {
  return {
    [Symbol.iterator]: f,
  }
}

export namespace Eff {
  export const of = <A>(value: A) =>
    // eslint-disable-next-line require-yield
    Eff(function* () {
      return value
    })

  export const fromLazy = <A>(f: Lazy<A>) =>
    // eslint-disable-next-line require-yield
    Eff(function* () {
      return f()
    })

  export class Instruction<I, O> {
    constructor(readonly input: I, readonly __trace?: string) {}

    *[Symbol.iterator](): Generator<this, O, O> {
      return yield this
    }
  }

  export type AnyEff = Eff<any, any> | Eff<never, never> | Eff<never, any> | Eff<any, never>
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

export const unit = Eff(function* () {
  // return void 0
})
