import { pipe } from 'hkt-ts'
import { Associative } from 'hkt-ts/Typeclass'
import * as EQ from 'hkt-ts/Typeclass/Eq'
import { Identity } from 'hkt-ts/Typeclass/Identity'
import * as ORD from 'hkt-ts/Typeclass/Ord'
import * as N from 'hkt-ts/number'

import * as FiberId from '@/FiberId/index.js'
import * as Trace from '@/Trace/Trace.js'

export type Cause<E> =
  | Empty
  | Interrupted
  | Unexpected
  | Expected<E>
  | Sequential<E, E>
  | Parallel<E, E>
  | Traced<E>

export interface Empty {
  readonly tag: 'Empty'
}
export const Empty: Empty = { tag: 'Empty' }

export class Interrupted {
  readonly tag = 'Interrupted'
  constructor(readonly fiberId: FiberId.FiberId) {}
}

export const interrupted = (fiberId: FiberId.FiberId): Cause<never> => new Interrupted(fiberId)

export class Unexpected {
  readonly tag = 'Unexpected'
  constructor(readonly error: unknown) {}
}

export const unexpected = (error: unknown): Cause<never> => new Unexpected(error)

export class Expected<E> {
  readonly tag = 'Expected'
  constructor(readonly error: E) {}
}

export const expected = <E>(error: E) => new Expected(error)

export class Sequential<E1, E2> {
  readonly tag = 'Sequential'
  constructor(readonly left: Cause<E1>, readonly right: Cause<E2>) {}
}

export const sequential = <E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> =>
  new Sequential(left, right)

export class Parallel<E1, E2> {
  readonly tag = 'Parallel'
  constructor(readonly left: Cause<E1>, readonly right: Cause<E2>) {}
}

export const parallel = <E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> =>
  new Parallel(left, right)

export class Traced<E> {
  readonly tag = 'Traced'
  constructor(readonly cause: Cause<E>, readonly trace: Trace.Trace) {}
}

export const traced =
  (trace: Trace.Trace) =>
  <E>(cause: Cause<E>): Cause<E> =>
    new Traced(cause, trace)

export const match =
  <A, B, C, E, D, F, G, H>(
    onEmpty: () => A,
    onInterrupted: (fiberId: FiberId.FiberId) => B,
    onUnexpected: (error: unknown) => C,
    onExpected: (e: E) => D,
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
      case 'Unexpected':
        return onUnexpected(cause.error)
      case 'Expected':
        return onExpected(cause.error)
      case 'Sequential':
        return onSequential(cause.left, cause.right)
      case 'Parallel':
        return onParallel(cause.left, cause.right)
      case 'Traced':
        return onTraced(cause.cause, cause.trace)
    }
  }

export const makeParallelAssociative = <E>(): Associative.Associative<Cause<E>> => ({
  concat: (left, right) =>
    left.tag === Empty.tag ? right : right.tag === Empty.tag ? left : new Parallel(left, right),
})

export const makeParallelIdentity = <E>(): Identity<Cause<E>> => ({
  ...makeParallelAssociative<E>(),
  id: Empty,
})

export const makeSequentialAssociative = <E>(): Associative.Associative<Cause<E>> => ({
  concat: (left, right) =>
    left.tag === Empty.tag ? right : right.tag === Empty.tag ? left : new Sequential(left, right),
})

export const makeSequentialIdentity = <E>(): Identity<Cause<E>> => ({
  ...makeSequentialAssociative<E>(),
  id: Empty,
})

export const makeEq = <E>(Eq: EQ.Eq<E>): EQ.Eq<Cause<E>> => {
  const eq = EQ.sum<Cause<E>>()('tag')({
    Empty: EQ.AlwaysEqual,
    Interrupted: EQ.struct({
      tag: EQ.AlwaysEqual,
      fiberId: FiberId.Eq,
    }),
    Unexpected: EQ.struct({
      tag: EQ.AlwaysEqual,
      error: EQ.DeepEquals,
    }),
    Expected: EQ.struct({
      tag: EQ.AlwaysEqual,
      error: Eq,
    }),
    Sequential: EQ.struct({
      tag: EQ.AlwaysEqual,
      left: EQ.lazy(() => eq),
      right: EQ.lazy(() => eq),
    }),
    Parallel: EQ.struct({
      tag: EQ.AlwaysEqual,
      left: EQ.lazy(() => eq),
      right: EQ.lazy(() => eq),
    }),
    Traced: EQ.struct({
      tag: EQ.AlwaysEqual,
      cause: EQ.lazy(() => eq),
      trace: Trace.Eq,
    }),
  })

  return eq
}

const tagOrd = pipe(
  N.Ord,
  ORD.contramap((x: Cause<any>['tag']) => {
    switch (x) {
      case 'Empty':
        return 0
      case 'Unexpected':
        return 1
      case 'Expected':
        return 2
      case 'Interrupted':
        return 3
      case 'Parallel':
        return 4
      case 'Sequential':
        return 5
      case 'Traced':
        return 6
    }
  }),
)

export const makeOrd = <E>(Eq: ORD.Ord<E>): ORD.Ord<Cause<E>> => {
  const ord = ORD.sum<Cause<E>>()('tag')(tagOrd)({
    Empty: ORD.Static,
    Interrupted: ORD.struct({
      fiberId: FiberId.Ord,
      tag: ORD.Static,
    })(ORD.Static),
    Unexpected: ORD.struct({
      error: ORD.Static,
      tag: ORD.Static,
    })(ORD.Static),
    Expected: ORD.struct({
      error: Eq,
      tag: ORD.Static,
    })(ORD.Static),
    Sequential: ORD.struct({
      left: ORD.lazy(() => ord),
      right: ORD.lazy(() => ord),
      tag: ORD.Static,
    })(ORD.Static),
    Parallel: ORD.struct({
      left: ORD.lazy(() => ord),
      right: ORD.lazy(() => ord),
      tag: ORD.Static,
    })(ORD.Static),
    Traced: ORD.struct({
      cause: ORD.lazy(() => ord),
      trace: Trace.Ord,
      tag: ORD.Static,
    })(ORD.Static),
  })

  return ord
}
