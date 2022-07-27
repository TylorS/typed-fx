import { HKT2, Params } from "hkt-ts";
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import * as AF from "hkt-ts/Typeclass/AssociativeFlatten";
import * as C from "hkt-ts/Typeclass/Covariant";
import { IdentityFlatten2 } from "hkt-ts/Typeclass/IdentityFlatten";
import { Top2 } from "hkt-ts/Typeclass/Top";
import { Eff } from "./Eff.js";
import { fromValue } from "./primitives.js";

export interface EffHKT extends HKT2 {
  readonly type: Eff<this[Params.E], this[Params.A]>
}

export const Covariant: C.Covariant2<EffHKT> = {
  map: (f) => eff => Eff(function* () {
    return f(yield* eff)
  })
}

export const map = Covariant.map
export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const Top: Top2<EffHKT> = {
  top: fromValue([])
}

export const top = Top.top

export const Flatten: AF.AssociativeFlatten2<EffHKT> = {
  flatten: eff => Eff(function* () {
    return yield* yield* eff
  })
}


export const flatten = Flatten.flatten
export const bind = AF.bind<EffHKT>({ ...Flatten, ...Covariant })

export const flatMap = <A, Y2, B>(f: (a: A) => Eff<Y2, B>) => <Y>(eff: Eff<Y, A>) => Eff(function* () {
  return yield* f(yield* eff)
})

export const IdentityFlatten: IdentityFlatten2<EffHKT> = {
  ...Flatten,
  ...Top,
}

export const AssociativeBoth: AB.AssociativeBoth2<EffHKT> = AF.makeAssociativeBoth<EffHKT>({
  ...Flatten,
  ...Covariant,
})

export const zipLeft = AB.zipLeft<EffHKT>({ ...AssociativeBoth, ...Covariant })
export const zipRight = AB.zipRight<EffHKT>({ ...AssociativeBoth, ...Covariant })

export const IdentityBoth: IB.IdentityBoth2<EffHKT> = {
  ...AssociativeBoth,
  ...Top,
}

export const tuple = IB.tuple<EffHKT>({ ...IdentityBoth, ...Covariant })
export const struct = IB.struct<EffHKT>({ ...IdentityBoth, ...Covariant })
