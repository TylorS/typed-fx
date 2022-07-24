import { HKT, Kind, Maybe, Params, identity, pipe } from 'hkt-ts'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as AF from 'hkt-ts/Typeclass/AssociativeFlatten'
import { Bottom1 } from 'hkt-ts/Typeclass/Bottom'
import { Compact1 } from 'hkt-ts/Typeclass/Compact'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as FIM from 'hkt-ts/Typeclass/FilterMap'
import * as FM from 'hkt-ts/Typeclass/FoldMap'
import * as FE from 'hkt-ts/Typeclass/ForEach'
import { Identity } from 'hkt-ts/Typeclass/Identity'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import { IdentityFlatten1 } from 'hkt-ts/Typeclass/IdentityFlatten'
import * as T from 'hkt-ts/Typeclass/Top'

import * as Cause from './Cause'

export interface CauseHKT extends HKT {
  readonly type: Cause.Cause<this[Params.A]>
}

export const Covariant: C.Covariant1<CauseHKT> = {
  map: function map<A, B>(f: (a: A) => B): (cause: Cause.Cause<A>) => Cause.Cause<B> {
    return Cause.match(
      () => Cause.Empty,
      (id) => new Cause.Interrupted(id),
      (error) => new Cause.Died(error),
      (e) => new Cause.Failed(f(e)),
      (left, right) => new Cause.Sequential(map(f)(left), map(f)(right)),
      (left, right) => new Cause.Parallel(map(f)(left), map(f)(right)),
      (cause, trace) => new Cause.Traced(map(f)(cause), trace),
    )
  },
}

export const map = Covariant.map
export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const Top: T.Top1<CauseHKT> = {
  top: Cause.failed([]),
}

export const top = Top.top
export const fromValue = T.makeFromValue<CauseHKT>({ ...Top, ...Covariant })
export const fromLazy = T.makeFromLazy<CauseHKT>({ ...Top, ...Covariant })

export const Bottom: Bottom1<CauseHKT> = {
  bottom: Cause.Empty,
}

export const bottom = Bottom.bottom

export const Flatten: AF.AssociativeFlatten1<CauseHKT> = {
  flatten: Cause.match(
    () => Cause.Empty,
    (id) => new Cause.Interrupted(id),
    (error) => new Cause.Died(error),
    identity,
    (left, right) => new Cause.Sequential(flatten(left), flatten(right)),
    (left, right) => new Cause.Parallel(flatten(left), flatten(right)),
    (cause, trace) => new Cause.Traced(flatten(cause), trace),
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
      (cause: Cause.Cause<A>): Kind<T2, Cause.Cause<B>> => {
        if (cause.tag === 'Failed') {
          return IBC.map(Cause.failed)(f(cause.error))
        }

        if (cause.tag === 'Sequential') {
          return pipe(
            tuple_(forEach_(f)(cause.left), forEach_(f)(cause.right)),
            IBC.map(([a, b]) => Cause.sequential(a, b)),
          )
        }

        if (cause.tag === 'Parallel') {
          return pipe(
            tuple_(forEach_(f)(cause.left), forEach_(f)(cause.right)),
            IBC.map(([a, b]) => Cause.parallel(a, b)),
          )
        }

        if (cause.tag === 'Traced') {
          return pipe(
            forEach_(f)(cause.cause),
            IBC.map((c) => new Cause.Traced(c, cause.trace)),
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
      function fold(cause: Cause.Cause<A>): B {
        return pipe(
          cause,
          Cause.match(
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
    Cause.match(
      () => Cause.Empty,
      (id) => new Cause.Interrupted(id),
      (e) => new Cause.Died(e),
      (a) =>
        pipe(
          a,
          f,
          Maybe.match(() => Cause.Empty, Cause.failed),
        ),
      (left, right) =>
        new Cause.Sequential(FilterMap.filterMap(f)(left), FilterMap.filterMap(f)(right)),
      (left, right) =>
        new Cause.Parallel(FilterMap.filterMap(f)(left), FilterMap.filterMap(f)(right)),
      (cause, trace) => new Cause.Traced(FilterMap.filterMap(f)(cause), trace),
    ),
}

export const filterMap = FilterMap.filterMap
export const compact = FIM.compact(FilterMap)
export const filter = FIM.filter(FilterMap)

export const Compact: Compact1<CauseHKT> = {
  compact,
}

export const compacted = FE.compacted<CauseHKT>({ ...ForEach, ...Compact })
