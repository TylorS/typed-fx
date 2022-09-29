import { HKT3, Params } from 'hkt-ts'
import { AssociativeBoth3 } from 'hkt-ts/Typeclass/AssociativeBoth'
import { Covariant3 } from 'hkt-ts/Typeclass/Covariant'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import { Top3 } from 'hkt-ts/Typeclass/Top'

import { ErrorsOf, Fx, OutputOf, ResourcesOf } from './Fx.js'
import { now } from './constructors.js'
import { both, map } from './control-flow.js'

export interface FxHKT extends HKT3 {
  readonly type: Fx<this[Params.R], this[Params.E], this[Params.A]>
}

export const Covariant: Covariant3<FxHKT> = {
  map,
}

export const AssociativeBoth: AssociativeBoth3<FxHKT> = {
  both,
}

export const Top: Top3<FxHKT> = {
  top: now([]),
}

export const IdentityBoth: IB.IdentityBoth3<FxHKT> = {
  ...AssociativeBoth,
  ...Top,
}

export const tuple = IB.tuple<FxHKT>({ ...IdentityBoth, ...Covariant }) as <
  FX extends ReadonlyArray<Fx<any, any, any>>,
>(
  ...fxs: FX
) => Fx<
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  {
    readonly [K in keyof FX]: OutputOf<FX[K]>
  }
>
export const struct = IB.struct<FxHKT>({ ...IdentityBoth, ...Covariant })
