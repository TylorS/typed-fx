import { Lazy } from 'hkt-ts/function'

export interface Stream<out R, out E, out A> {
  readonly __Stream__: {
    readonly R: () => R
    readonly E: () => E
    readonly A: () => A
  }
}

export interface Now<A> {
  readonly tag: 'Now'
  readonly value: A
}

export interface FromLazy<A> {
  readonly tag: 'FromLazy'
  readonly lazy: Lazy<A>
}

export interface FlatMap<R, E, A, R2, E2, B> {
  readonly tag: 'FlatMap'
  readonly stream: Stream<R, E, A>
  readonly f: (a: A) => Stream<R2, E2, B>
}
