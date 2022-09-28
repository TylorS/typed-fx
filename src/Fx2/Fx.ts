import type { Scope } from './Scope.js'

export abstract class Fx<R, E, A> {
  readonly __FX__!: {
    readonly _R: (_: never) => R
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }

  static tag: string
  abstract readonly tag: string

  readonly [Symbol.iterator] = yieldThis
}

export namespace Fx {
  export abstract class Of<A> extends Fx<never, never, A> {}
  export abstract class IO<E, A> extends Fx<never, E, A> {}
  export abstract class RIO<R, A> extends Fx<R, never, A> {}
  export abstract class Scoped<R, E, A> extends Fx<R | Scope, E, A> {}

  export namespace Scoped {
    export interface Of<A> extends Scoped<never, never, A> {}
    export interface IO<E, A> extends Scoped<never, E, A> {}
    export interface RIO<R, A> extends Scoped<R, never, A> {}
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends Fx<infer R, infer _E, infer _A> ? R : never
export type ErrorsOf<T> = T extends Fx<infer _R, infer E, infer _A> ? E : never
export type OutputOf<T> = T extends Fx<infer _R, infer _E, infer A> ? A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

function* yieldThis<T>(this: T): Generator<T, OutputOf<T>, any> {
  return yield this
}
