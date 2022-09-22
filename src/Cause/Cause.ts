import { HKT, Kind, Maybe, Params, identity, pipe } from 'hkt-ts'
import { Associative } from 'hkt-ts/Typeclass'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as AF from 'hkt-ts/Typeclass/AssociativeFlatten'
import { Bottom1 } from 'hkt-ts/Typeclass/Bottom'
import { Compact1 } from 'hkt-ts/Typeclass/Compact'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as D from 'hkt-ts/Typeclass/Debug'
import * as EQ from 'hkt-ts/Typeclass/Eq'
import * as FIM from 'hkt-ts/Typeclass/FilterMap'
import * as FM from 'hkt-ts/Typeclass/FoldMap'
import * as FE from 'hkt-ts/Typeclass/ForEach'
import { Identity } from 'hkt-ts/Typeclass/Identity'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import { IdentityFlatten1 } from 'hkt-ts/Typeclass/IdentityFlatten'
import * as ORD from 'hkt-ts/Typeclass/Ord'
import * as T from 'hkt-ts/Typeclass/Top'
import * as N from 'hkt-ts/number'

import { Renderer, defaultRenderer, prettyPrint } from './Renderer.js'

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

export type AnyCause = Cause<any> | Cause<never>

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

export const isEmpty = <E>(cause: Cause<E>): cause is Empty => cause.tag === Empty.tag
export const isInterrupted = <E>(cause: Cause<E>): cause is Interrupted =>
  cause.tag === 'Interrupted'
export const isUnexpected = <E>(cause: Cause<E>): cause is Unexpected => cause.tag === 'Unexpected'
export const isExpected = <E>(cause: Cause<E>): cause is Expected<E> => cause.tag === 'Expected'
export const isSequential = <E>(cause: Cause<E>): cause is Sequential<E, E> =>
  cause.tag === 'Sequential'
export const isParallel = <E>(cause: Cause<E>): cause is Parallel<E, E> => cause.tag === 'Parallel'
export const isTraced = <E>(cause: Cause<E>): cause is Traced<E> => cause.tag === 'Traced'

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

export function shouldRethrow(error: Cause<any>): boolean {
  return error.tag === 'Unexpected' || (error.tag === 'Traced' && shouldRethrow(error.cause))
}

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

export interface CauseHKT extends HKT {
  readonly type: Cause<this[Params.A]>
}

export const Covariant: C.Covariant1<CauseHKT> = {
  map: function map<A, B>(f: (a: A) => B): (cause: Cause<A>) => Cause<B> {
    return match(
      () => Empty,
      (id) => new Interrupted(id),
      (error) => new Unexpected(error),
      (e) => new Expected(f(e)),
      (left, right) => new Sequential(map(f)(left), map(f)(right)),
      (left, right) => new Parallel(map(f)(left), map(f)(right)),
      (cause, trace) => new Traced(map(f)(cause), trace),
    )
  },
}

export const map = Covariant.map
export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const Top: T.Top1<CauseHKT> = {
  get top() {
    return expected([])
  },
}

export const top = Top.top
export const fromValue = T.makeFromValue<CauseHKT>({ ...Top, ...Covariant })
export const fromLazy = T.makeFromLazy<CauseHKT>({ ...Top, ...Covariant })

export const Bottom: Bottom1<CauseHKT> = {
  bottom: Empty,
}

export const bottom = Bottom.bottom

export const Flatten: AF.AssociativeFlatten1<CauseHKT> = {
  flatten: match(
    () => Empty,
    (id) => new Interrupted(id),
    (error) => new Unexpected(error),
    identity,
    (left, right) => new Sequential(flatten(left), flatten(right)),
    (left, right) => new Parallel(flatten(left), flatten(right)),
    (cause, trace) => new Traced(flatten(cause), trace),
  ),
}

export const flatten = Flatten.flatten
export const flatMap = AF.flatMap<CauseHKT>({ ...Flatten, ...Covariant })
export const bind = AF.bind<CauseHKT>({ ...Flatten, ...Covariant })

export const IdentityFlatten: IdentityFlatten1<CauseHKT> = {
  ...Flatten,
  ...Top,
}

export const AssociativeBoth: AB.AssociativeBoth1<CauseHKT> = AF.makeAssociativeBoth<CauseHKT>({
  ...Flatten,
  ...Covariant,
})

export const zipLeft = AB.zipLeft<CauseHKT>({ ...AssociativeBoth, ...Covariant })
export const zipRight = AB.zipRight<CauseHKT>({ ...AssociativeBoth, ...Covariant })

export const IdentityBoth: IB.IdentityBoth1<CauseHKT> = {
  ...AssociativeBoth,
  ...Top,
}

export const tuple = IB.tuple<CauseHKT>({ ...IdentityBoth, ...Covariant })
export const struct = IB.struct<CauseHKT>({ ...IdentityBoth, ...Covariant })

export const ForEach: FE.ForEach1<CauseHKT> = {
  map,
  forEach: <T2 extends HKT>(IBC: IB.IdentityBoth<T2> & C.Covariant<T2>) => {
    const tuple_ = IB.tuple(IBC)
    const fromValue_ = T.makeFromValue(IBC)

    const forEach_ =
      <A, B>(f: (a: A) => Kind<T2, B>) =>
      (cause: Cause<A>): Kind<T2, Cause<B>> => {
        if (cause.tag === 'Expected') {
          return IBC.map(expected)(f(cause.error))
        }

        if (cause.tag === 'Sequential') {
          return pipe(
            tuple_(forEach_(f)(cause.left), forEach_(f)(cause.right)),
            IBC.map(([a, b]) => sequential(a, b)),
          )
        }

        if (cause.tag === 'Parallel') {
          return pipe(
            tuple_(forEach_(f)(cause.left), forEach_(f)(cause.right)),
            IBC.map(([a, b]) => parallel(a, b)),
          )
        }

        if (cause.tag === 'Traced') {
          return pipe(
            forEach_(f)(cause.cause),
            IBC.map((c) => new Traced(c, cause.trace)),
          )
        }

        return fromValue_(cause)
      }

    return forEach_
  },
}

export const forEach = FE.forEach
export const mapAccum = FE.mapAccum(ForEach)
export const sequence = FE.sequence(ForEach)

export const FoldMap: FM.FoldMap1<CauseHKT> = {
  foldMap:
    <B>(I: Identity<B>) =>
    <A>(f: (a: A) => B) =>
      function fold(cause: Cause<A>): B {
        return pipe(
          cause,
          match(
            () => I.id,
            () => I.id,
            () => I.id,
            f,
            (left, right) => I.concat(fold(left), fold(right)),
            (left, right) => I.concat(fold(left), fold(right)),
            fold,
          ),
        )
      },
}

export const foldMap = FoldMap.foldMap
export const foldLeft = FM.foldLeft(FoldMap)
export const contains = FM.contains(FoldMap)
export const count = FM.count(FoldMap)
export const every = FM.every(FoldMap)
export const some = FM.some(FoldMap)
export const exists = FM.exists(FoldMap)
export const find = FM.find(FoldMap)
export const groupBy = FM.groupBy(FoldMap)
export const intercalate = FM.intercalate(FoldMap)
export const reduce = FM.reduce(FoldMap)
export const reduceAssociative = FM.reduceAssociative(FoldMap)
export const reduceCommutative = FM.reduceCommutative(FoldMap)
export const reduceIdentity = FM.reduceIdentity(FoldMap)
export const reduceRight = FM.reduceRight<CauseHKT>({ ...FoldMap, ...ForEach })
export const reverse = FM.reverse<CauseHKT>({ ...FoldMap, ...ForEach })
export const size = FM.size(FoldMap)
export const toArray = FM.toArray(FoldMap)

export const FilterMap: FIM.FilterMap1<CauseHKT> = {
  filterMap: (f) =>
    match(
      () => Empty,
      (id) => new Interrupted(id),
      (e) => new Unexpected(e),
      (a) =>
        pipe(
          a,
          f,
          Maybe.match(() => Empty, expected),
        ),
      (left, right) => new Sequential(FilterMap.filterMap(f)(left), FilterMap.filterMap(f)(right)),
      (left, right) => new Parallel(FilterMap.filterMap(f)(left), FilterMap.filterMap(f)(right)),
      (cause, trace) => new Traced(FilterMap.filterMap(f)(cause), trace),
    ),
}

export const filterMap = FilterMap.filterMap
export const compact = FIM.compact(FilterMap)
export const filter = FIM.filter(FilterMap)

export const Compact: Compact1<CauseHKT> = {
  compact,
}

export const compacted = FE.compacted<CauseHKT>({ ...ForEach, ...Compact })

export const makeDebug = <E>(renderer: Renderer<E> = defaultRenderer): D.Debug<Cause<E>> =>
  D.Debug((cause) => prettyPrint(cause, renderer))

export const Debug = makeDebug()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const findExpected = find(<E>(_e: E): _e is E => true)

export function findType<T extends Cause<any>['tag']>(tag: T) {
  return <E>(cause: Cause<E>): Maybe.Maybe<Cause<E>> => {
    if (cause.tag === tag) {
      return Maybe.Just(cause)
    }

    if (cause.tag === 'Sequential') {
      return pipe(
        findType(tag)(cause.left),
        Maybe.match(
          () => findType(tag)(cause.right),
          (a) =>
            pipe(
              findType(tag)(cause.right),
              Maybe.match(
                () => Maybe.Just(a),
                (b) => Maybe.Just(sequential(a, b)),
              ),
            ),
        ),
      )
    }

    if (cause.tag === 'Parallel') {
      return pipe(
        findType(tag)(cause.left),
        Maybe.match(
          () => findType(tag)(cause.right),
          (a) =>
            pipe(
              findType(tag)(cause.right),
              Maybe.match(
                () => Maybe.Just(a),
                (b) => Maybe.Just(parallel(a, b)),
              ),
            ),
        ),
      )
    }

    if (cause.tag === 'Traced') {
      return findType(tag)(cause.cause)
    }

    return Maybe.Nothing
  }
}

export const findInterrupted = findType('Interrupted')
