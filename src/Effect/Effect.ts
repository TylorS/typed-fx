import type { Op } from './Op.js'

export abstract class Effect<R, E, A> {
  abstract readonly op: Op
  abstract readonly [Symbol.iterator]: () => Generator<Effect<R, E, any>, A, any>
}

export namespace Effect {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  export type ResourcesOf<T> = T extends Effect<infer _R, infer _E, infer _A> ? _R : never
  export type ErrorsOf<T> = T extends Effect<infer _R, infer _E, infer _A> ? _E : never
  export type OutputOf<T> = T extends Effect<infer _R, infer _E, infer _A> ? _A : never
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
