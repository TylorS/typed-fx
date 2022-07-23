import type { Instruction } from './Instruction'

export interface Sync<R, E, A> {
  readonly [Symbol.iterator]: () => Generator<Instruction<R, E, any>, A>
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends Sync<infer _R, infer _E, infer _A> ? _R : never
export type ErrorsOf<T> = T extends Sync<infer _R, infer _E, infer _A> ? _E : never
export type OutputOf<T> = T extends Sync<infer _R, infer _E, infer _A> ? _A : never

export type ResourcesFromGenerator<T> = T extends Generator<
  Instruction<infer R, infer _E, infer _A>
>
  ? R
  : never
export type ErrorsFromGenerator<T> = T extends Generator<Instruction<infer _R, infer E, infer _A>>
  ? E
  : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export function Sync<G extends Generator<Instruction<any, any, any>, any>>(
  f: () => G,
): Sync<ResourcesFromGenerator<G>, ErrorsFromGenerator<G>, OutputOf<G>> {
  return {
    [Symbol.iterator]: f,
  }
}
