import { HKT3, Params } from 'hkt-ts'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as AF from 'hkt-ts/Typeclass/AssociativeFlatten'
import * as B from 'hkt-ts/Typeclass/Bottom'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as FM from 'hkt-ts/Typeclass/FilterMap'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import * as T from 'hkt-ts/Typeclass/Top'

import { Stream } from './Stream'
import { filterMap } from './filterMap'
import { flatten } from './flatMap'
import { fromFx } from './fromFx'
import { map } from './map'

import * as Fx from '@/Fx/index'

export interface StreamHKT extends HKT3 {
  readonly type: Stream<this[Params.R], this[Params.E], this[Params.A]>
}

export const Covariant: C.Covariant3<StreamHKT> = {
  map,
}

export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const FilterMap: FM.FilterMap3<StreamHKT> = {
  filterMap,
}

export const compact = FM.compact(FilterMap)
export const filter = FM.filter(FilterMap)

export const Top: T.Top3<StreamHKT> = {
  top: fromFx(Fx.top),
}

export const fromLazy = T.makeFromLazy<StreamHKT>({ ...Top, ...Covariant })
export const fromValue = T.makeFromValue<StreamHKT>({ ...Top, ...Covariant })

export const Bottom: B.Bottom3<StreamHKT> = {
  bottom: fromFx(Fx.bottom),
}

export const Flatten: AF.AssociativeFlatten3<StreamHKT> = {
  flatten,
}

export const bind = AF.bind<StreamHKT>({ ...Flatten, ...Covariant })

export const AssociativeBothSeq = AF.makeAssociativeBoth<StreamHKT>({ ...Flatten, ...Covariant })

export const zipLeftSeq = AB.zipLeft<StreamHKT>({ ...AssociativeBothSeq, ...Covariant })
export const zipRightSeq = AB.zipRight<StreamHKT>({ ...AssociativeBothSeq, ...Covariant })

export const IdentityBothSeq: IB.IdentityBoth3<StreamHKT> = {
  ...AssociativeBothSeq,
  ...Top,
}

export const zipAllSeq = IB.tuple<StreamHKT>({ ...IdentityBothSeq, ...Covariant })
export const structSeq = IB.struct<StreamHKT>({ ...IdentityBothSeq, ...Covariant })
