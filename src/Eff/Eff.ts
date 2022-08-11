import { Lazy } from 'hkt-ts/function'

import { InstanceOf } from '@/Service/index.js'

/**
 * Eff is a very thin abstraction over Generators which provides a way to
 * construct Effects that are interpreted.
 */
export interface Eff<Y, R> {
  readonly [Symbol.iterator]: () => Generator<Y, R, any> | Generator<Y, R, never>
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type YieldOf<T> = T extends Eff<infer _Y, infer _A> ? _Y : never
export type ReturnOf<T> = T extends Eff<infer _Y, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export function Eff<Y = never, R = unknown, N = unknown>(f: () => Generator<Y, R, N>): Eff<Y, R> {
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

  export const gen = <Y, R>(eff: Eff<Y, R>): Generator<Y, R> => eff[Symbol.iterator]()

  export abstract class Instruction<I, O> {
    static tag: string
    abstract readonly tag: string

    constructor(readonly input: I, readonly __trace?: string) {}

    *[Symbol.iterator](): Generator<this, O, O> {
      return yield this
    }

    readonly is = <U extends AnyInstructionConstructor>(instance: U): this is InstanceOf<U> =>
      this.tag === instance.tag
  }

  export type AnyEff = Eff<any, any> | Eff<never, never> | Eff<never, any> | Eff<any, never>

  export type AnyInstruction =
    | Instruction<any, any>
    | Instruction<never, never>
    | Instruction<never, any>
    | Instruction<any, never>

  export type AnyInstructionConstructor = {
    readonly tag: string

    new (input: any, __trace?: string): AnyInstruction
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

export const unit = Eff(function* () {
  // return void 0
})
