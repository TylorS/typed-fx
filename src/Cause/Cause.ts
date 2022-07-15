import { Associative } from 'hkt-ts/Typeclass'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import { FiberId } from '@/FiberId/FiberId'
import { EmptyTrace, Trace } from '@/Trace/Trace'

export type Cause<E> =
  | Empty
  | Interrupted
  | Died
  | Failed<E>
  | Sequential<E, E>
  | Parallel<E, E>
  | ShouldPrintStack<E>

export const Empty = { tag: 'Empty' } as const
export type Empty = typeof Empty

export class Interrupted {
  readonly tag = 'Interrupted'
  constructor(readonly fiberId: FiberId, readonly trace: Trace = EmptyTrace) {}
}

export class Died {
  readonly tag = 'Died'
  constructor(readonly error: unknown, readonly trace: Trace = EmptyTrace) {}
}

export class Failed<E> {
  readonly tag = 'Failed'
  constructor(readonly error: E, readonly trace: Trace = EmptyTrace) {}
}

export class Sequential<E1, E2> {
  readonly tag = 'Sequential'
  constructor(readonly left: Cause<E1>, readonly right: Cause<E2>) {}
}

export class Parallel<E1, E2> {
  readonly tag = 'Parallel'
  constructor(readonly left: Cause<E1>, readonly right: Cause<E2>) {}
}

export class ShouldPrintStack<E> {
  readonly tag = 'ShouldPrintStack'
  constructor(readonly cause: Cause<E>, readonly shouldPrintStack: boolean) {}
}

export const match =
  <A, B, C, E, D, F, G, H>(
    onEmpty: () => A,
    onInterrupted: (fiberId: FiberId, trace: Trace) => B,
    onDied: (error: unknown, trace: Trace) => C,
    onFailed: (e: E, trace: Trace) => D,
    onSequential: (left: Cause<E>, right: Cause<E>) => F,
    onParallel: (left: Cause<E>, right: Cause<E>) => G,
    onShouldPrintStack: (cause: Cause<E>, shouldPrintStack: boolean) => H,
  ) =>
  (cause: Cause<E>): A | B | C | D | F | G | H => {
    switch (cause.tag) {
      case 'Empty':
        return onEmpty()
      case 'Interrupted':
        return onInterrupted(cause.fiberId, cause.trace)
      case 'Died':
        return onDied(cause.error, cause.trace)
      case 'Failed':
        return onFailed(cause.error, cause.trace)
      case 'Sequential':
        return onSequential(cause.left, cause.right)
      case 'Parallel':
        return onParallel(cause.left, cause.right)
      case 'ShouldPrintStack':
        return onShouldPrintStack(cause.cause, cause.shouldPrintStack)
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
