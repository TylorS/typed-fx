import * as Eff from '@/Eff/index.js'
import { HKT3, Params, pipe, Variance } from 'hkt-ts'
import * as R from 'hkt-ts/Record'
import * as M from 'hkt-ts/Map'
import * as S from 'hkt-ts/Set'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as AF from 'hkt-ts/Typeclass/AssociativeFlatten'
import * as CB from 'hkt-ts/Typeclass/CommutativeBoth'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import * as T from 'hkt-ts/Typeclass/Top'
import * as Fx from './Fx.js'

import * as A from 'hkt-ts/Array'
import * as AE from 'hkt-ts/Typeclass/AssociativeEither'
import { Left, Right } from 'hkt-ts/Either'
import { IdentityEither3 } from 'hkt-ts/Typeclass/IdentityEither'
import { Bottom3 } from 'hkt-ts/Typeclass/Bottom'

export interface FxHKT extends HKT3 {
  readonly type: Fx.Fx<this[Params.R], this[Params.E], this[Params.A]>
  readonly defaults?: {
    [Params.R]: Variance.Covariant<never>
    [Params.E]: Variance.Covariant<never>
  }
}

export const Covariant: C.Covariant3<FxHKT> = Eff.Covariant

export const map = Covariant.map
export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const Flatten: AF.AssociativeFlatten3<FxHKT> = Eff.Flatten

export const flatMap = AF.flatMap<FxHKT>({ ...Flatten, ...Covariant })
export const bind = AF.bind<FxHKT>({ ...Flatten, ...Covariant })

export const AssociativeBoth: AB.AssociativeBoth3<FxHKT> = Eff.AssociativeBoth

export const bothSeq = AssociativeBoth.both
export const zipLeftSeq = AB.zipLeft<FxHKT>({ ...AssociativeBoth, ...Covariant })
export const zipRightSeq = AB.zipRight<FxHKT>({ ...AssociativeBoth, ...Covariant })

export const CommutativeBoth: CB.CommutativeBoth3<FxHKT> = {
  both: (s) => (f) => Fx.zipAll([f, s] as const, 'CommutativeBoth'),
}

export const both = CommutativeBoth.both
export const zipLeft = AB.zipLeft<FxHKT>({ ...CommutativeBoth, ...Covariant })
export const zipRight = AB.zipRight<FxHKT>({ ...CommutativeBoth, ...Covariant })

export const Top: T.Top3<FxHKT> = {
  top: Fx.fromValue([]),
}

export const top = Top.top

export const IdentityBoth: IB.IdentityBoth3<FxHKT> = {
  ...CommutativeBoth,
  ...Top,
}

const IdentityBothCovariant: IB.IdentityBoth3<FxHKT> & C.Covariant3<FxHKT> = {
  ...IdentityBoth,
  ...Covariant,
}

export const tuple = Fx.zipAll
export const struct = IB.struct<FxHKT>(IdentityBothCovariant) as <
  FXS extends R.ReadonlyRecord<string, Fx.AnyFx>,
>(
  fx: FXS,
) => Fx.Fx<
  Fx.ResourcesOf<FXS[string]>,
  Fx.ErrorsOf<FXS[string]>,
  { readonly [K in keyof FXS]: Fx.OutputOf<FXS[K]> }
>

export const IdentityBothSeq: IB.IdentityBoth3<FxHKT> = {
  ...AssociativeBoth,
  ...Top,
}

export const tupleSeq = IB.tuple<FxHKT>({ ...IdentityBothSeq, ...Covariant }) as <
  FXS extends ReadonlyArray<Fx.AnyFx>,
>(
  fx: FXS,
) => Fx.Fx<
  Fx.ResourcesOf<FXS[number]>,
  Fx.ErrorsOf<FXS[number]>,
  { readonly [K in keyof FXS]: Fx.OutputOf<FXS[K]> }
>

export const structSeq = IB.struct<FxHKT>({ ...IdentityBothSeq, ...Covariant }) as <
  FXS extends R.ReadonlyRecord<string, Fx.AnyFx>,
>(
  fx: FXS,
) => Fx.Fx<
  Fx.ResourcesOf<FXS[string]>,
  Fx.ErrorsOf<FXS[string]>,
  { readonly [K in keyof FXS]: Fx.OutputOf<FXS[K]> }
>

export const forEachArray = A.forEach<FxHKT>(IdentityBothCovariant) as <A, R, E, B>(
  f: (a: A) => Fx.Fx<R, E, B>,
) => (kind: readonly A[]) => Fx.Fx<R, E, readonly B[]>

export const sequenceArray = A.sequence<FxHKT>(IdentityBothCovariant) as <R, E, A>(
  kind: readonly Fx.Fx<R, E, A>[],
) => Fx.Fx<R, E, readonly A[]>

export const forEachRecord = R.forEach<FxHKT>(IdentityBothCovariant) as <A, R, E, B>(
  f: (a: A) => Fx.Fx<R, E, B>,
) => <K extends string>(kind: R.ReadonlyRecord<K, A>) => Fx.Fx<R, E, R.ReadonlyRecord<K, B>>

export const forEachMap = M.forEach<FxHKT>(IdentityBothCovariant) as <A, R, E, B>(
  f: (a: A) => Fx.Fx<R, E, B>,
) => <K>(kind: ReadonlyMap<K, A>) => Fx.Fx<R, E, ReadonlyMap<K, B>>

export const forEachSet = S.forEach<FxHKT>(IdentityBothCovariant) as <A, R, E, B>(
  f: (a: A) => Fx.Fx<R, E, B>,
) => (kind: ReadonlySet<A>) => Fx.Fx<R, E, ReadonlySet<B>>

export const sequenceSet = S.sequence<FxHKT>(IdentityBothCovariant) as <R, E, A>(
  kind: ReadonlySet<Fx.Fx<R, E, A>>,
) => Fx.Fx<R, E, ReadonlySet<A>>

export const AssociativeEither: AE.AssociativeEither3<FxHKT> = {
  either: (s) => (f) => Fx.raceAll([pipe(f, map(Left)), pipe(s, map(Right))] as const),
}

export const either = AssociativeEither.either
export const eventually = AE.eventually<FxHKT>({ ...AssociativeEither, ...Covariant })
export const orElse = AE.orElse<FxHKT>({ ...AssociativeEither, ...Covariant })

export const Bottom: Bottom3<FxHKT> = {
  bottom: Fx.async(() => Left(Fx.unit))
}

export const bottom = Bottom.bottom
export const never = bottom

export const IdentityEither: IdentityEither3<FxHKT> = {
  ...AssociativeEither,
  ...Bottom,
}
