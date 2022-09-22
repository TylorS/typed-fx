import { HKT3, Params } from 'hkt-ts'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as AF from 'hkt-ts/Typeclass/AssociativeFlatten'
import * as B from 'hkt-ts/Typeclass/Bicovariant'
import { Bottom3 } from 'hkt-ts/Typeclass/Bottom'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as FM from 'hkt-ts/Typeclass/FilterMap'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import { IdentityFlatten3 } from 'hkt-ts/Typeclass/IdentityFlatten'
import * as T from 'hkt-ts/Typeclass/Top'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'
import { bimap, filterMap, map } from './bimap.js'
import { join } from './flatMap.js'
import { mergeConcurrently } from './flatMapConcurrently.js'
import { fromFx } from './fromFx.js'

import * as Fx from '@/Fx/index.js'

// TOOD: AssociativeEither
// TODO: IdentityEither
// TODO: IdentityFlatten

export interface StreamHKT extends HKT3 {
  readonly type: Stream<this[Params.R], this[Params.E], this[Params.A]>
}

export const Bicovariant: B.Bicovariant3<StreamHKT> = {
  bimap,
}

export const Covariant: C.Covariant3<StreamHKT> = {
  map,
}

export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const Top: T.Top3<StreamHKT> = {
  top: fromFx(Fx.top),
}

export const Bottom: Bottom3<StreamHKT> = {
  bottom: fromFx(Fx.bottom),
}

export const Flatten: AF.AssociativeFlatten3<StreamHKT> = {
  flatten: join,
}

export const IdentityFlatten: IdentityFlatten3<StreamHKT> = {
  ...Flatten,
  ...Top,
}

export const makeFlattenConcurrently = (
  concurrencyLevel: NonNegativeInteger,
): AF.AssociativeFlatten3<StreamHKT> => ({
  flatten: mergeConcurrently(concurrencyLevel),
})

export const AssociativeBoth = AF.makeAssociativeBoth<StreamHKT>({
  ...Flatten,
  ...Covariant,
})

export const zipLeftSeq = AB.zipLeft<StreamHKT>({ ...AssociativeBoth, ...Covariant })
export const zipRightSeq = AB.zipRight<StreamHKT>({ ...AssociativeBoth, ...Covariant })

export const IdentityBoth: IB.IdentityBoth3<StreamHKT> = {
  ...AssociativeBoth,
  ...Top,
}

export const structSeq = IB.struct<StreamHKT>({ ...IdentityBoth, ...Covariant })

export const FilterMap: FM.FilterMap3<StreamHKT> = {
  filterMap,
}

export const compact = FM.compact(FilterMap)
export const filter = FM.filter(FilterMap)
