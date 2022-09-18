import { HKT3, Params } from 'hkt-ts'
import * as B from 'hkt-ts/Typeclass/Bicovariant'
import * as C from 'hkt-ts/Typeclass/Covariant'

import { Stream } from './Stream.js'
import { bimap } from './bimap.js'
import { map } from './map.js'

// TODO: AssociativeBoth
// TOOD: AssociativeEither
// TODO: Top
// TODO: Bottom
// TODO: FilterMap
// TODO: AssociativeFlatten
// TODO: IdentityBoth
// TODO: IdentityEither
// TODO: IdentityFlatten

export interface StreamHKT extends HKT3 {
  readonly type: Stream<this[Params.R], this[Params.E], this[Params.A]>
}

export const Bicovariant: B.Bicovariant3<StreamHKT> = {
  bimap,
}

export const mapLeft = B.mapLeft(Bicovariant)

export const Covariant: C.Covariant3<StreamHKT> = {
  map,
}

export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)
