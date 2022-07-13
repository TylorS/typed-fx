import { HKT, Params } from 'hkt-ts'
import { Associative } from 'hkt-ts/Typeclass'
import { Identity } from 'hkt-ts/Typeclass/Identity'
import { A } from 'ts-toolbelt'

import { FiberId } from '@/FiberId/FiberId'
import { EmptyTrace, Trace } from '@/Trace/Trace'

export type Cause<E> =
  | Empty
  | Interrupted
  | Died
  | (A.Equals<never, E> extends 1 ? never : Failed<E>)
  | Sequential<E, E>
  | Parallel<E, E>
  | ShouldPrintStack<E>

export const Empty = { tag: 'Empty' } as const
export type Empty = typeof Empty

export class Interrupted {
  constructor(readonly fiberId: FiberId, readonly trace: Trace = EmptyTrace) {}
}

export class Died {
  constructor(readonly error: unknown, readonly trace: Trace = EmptyTrace) {}
}

export class Failed<out E> {
  constructor(readonly error: E, readonly trace: Trace = EmptyTrace) {}
}

export class Sequential<out E1, out E2> {
  constructor(readonly left: Cause<E1>, readonly right: Cause<E2>) {}
}

export class Parallel<out E1, out E2> {
  constructor(readonly left: Cause<E1>, readonly right: Cause<E2>) {}
}

export class ShouldPrintStack<out E> {
  constructor(readonly cause: Cause<E>, readonly shouldPrintStack: boolean) {}
}

export interface CauseHKT extends HKT {
  readonly type: Cause<this[Params.A]>
}

export const makeParallelAssociative = <E>(): Associative.Associative<Cause<E>> => ({
  concat: (left, right) => new Parallel(left, right),
})

export const makeParallelIdentity = <E>(): Identity<Cause<E>> => ({
  ...makeParallelAssociative<E>(),
  id: Empty,
})

export const makeSequentialAssociative = <E>(): Associative.Associative<Cause<E>> => ({
  concat: (left, right) => new Sequential(left, right),
})

export const makeSequentialIdentity = <E>(): Identity<Cause<E>> => ({
  ...makeSequentialAssociative<E>(),
  id: Empty,
})
