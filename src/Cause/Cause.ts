import { Associative } from 'hkt-ts/Typeclass'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import { FiberId } from '@/FiberId/index'
import * as Trace from '@/Trace/Trace'

export type Cause<E> =
  | Empty
  | Interrupted
  | Died
  | Failed<E>
  | Sequential<E, E>
  | Parallel<E, E>
  | Traced<E>

export const Empty = new (class Empty {
  readonly tag = 'Empty'
})()
export type Empty = typeof Empty

export class Interrupted {
  readonly tag = 'Interrupted'
  constructor(readonly fiberId: FiberId) {}
}

export const interrupted = (fiberId: FiberId) => new Interrupted(fiberId)

export class Died {
  readonly tag = 'Died'
  constructor(readonly error: unknown) {}
}

export const died = (error: unknown) => new Died(error)

export class Failed<E> {
  readonly tag = 'Failed'
  constructor(readonly error: E) {}
}

export const failed = <E>(error: E) => new Failed(error)

export class Sequential<E1, E2> {
  readonly tag = 'Sequential'
  constructor(readonly left: Cause<E1>, readonly right: Cause<E2>) {}
}

export const sequential = <E1, E2>(left: Cause<E1>, right: Cause<E2>) => new Sequential(left, right)

export class Parallel<E1, E2> {
  readonly tag = 'Parallel'
  constructor(readonly left: Cause<E1>, readonly right: Cause<E2>) {}
}

export const parallel = <E1, E2>(left: Cause<E1>, right: Cause<E2>) => new Parallel(left, right)

export class Traced<E> {
  readonly tag = 'Traced'
  constructor(readonly cause: Cause<E>, readonly trace: Trace.Trace) {}
}

export const traced =
  (trace: Trace.Trace) =>
  <E>(cause: Cause<E>) =>
    new Traced(cause, trace)

export const match =
  <A, B, C, E, D, F, G, H>(
    onEmpty: () => A,
    onInterrupted: (fiberId: FiberId) => B,
    onDied: (error: unknown) => C,
    onFailed: (e: E) => D,
    onSequential: (left: Cause<E>, right: Cause<E>) => F,
    onParallel: (left: Cause<E>, right: Cause<E>) => G,
    onTraced: (cause: Cause<E>, trace: Trace.Trace) => H,
  ) =>
  (cause: Cause<E>): A | B | C | D | F | G | H => {
    switch (cause.tag) {
      case 'Empty':
        return onEmpty()
      case 'Interrupted':
        return onInterrupted(cause.fiberId)
      case 'Died':
        return onDied(cause.error)
      case 'Failed':
        return onFailed(cause.error)
      case 'Sequential':
        return onSequential(cause.left, cause.right)
      case 'Parallel':
        return onParallel(cause.left, cause.right)
      case 'Traced':
        return onTraced(cause.cause, cause.trace)
    }
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
