import { HKT3, Params, Variance, pipe } from 'hkt-ts'
import * as A from 'hkt-ts/Array'
import { Left, Right, isRight } from 'hkt-ts/Either'
import * as M from 'hkt-ts/Map'
import * as R from 'hkt-ts/Record'
import * as S from 'hkt-ts/Set'
import { Associative } from 'hkt-ts/Typeclass/Associative'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as AE from 'hkt-ts/Typeclass/AssociativeEither'
import * as AF from 'hkt-ts/Typeclass/AssociativeFlatten'
import { Bottom3 } from 'hkt-ts/Typeclass/Bottom'
import * as CB from 'hkt-ts/Typeclass/CommutativeBoth'
import * as CE from 'hkt-ts/Typeclass/CommutativeEither'
import * as C from 'hkt-ts/Typeclass/Covariant'
import { Identity, fromIdentityEitherCovariant } from 'hkt-ts/Typeclass/Identity'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import { IdentityEither3 } from 'hkt-ts/Typeclass/IdentityEither'
import * as T from 'hkt-ts/Typeclass/Top'

import * as Fx from './Fx.js'

import { Sequential } from '@/Cause/index.js'
import * as Eff from '@/Eff/index.js'

export interface FxHKT extends HKT3 {
  readonly type: Fx.Fx<this[Params.R], this[Params.E], this[Params.A]>
  readonly defaults: {
    [Params.R]: Variance.Covariant<unknown>
    [Params.E]: Variance.Covariant<unknown>
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
) => (array: readonly A[]) => Fx.Fx<R, E, readonly B[]>

export const sequenceArray = A.sequence<FxHKT>(IdentityBothCovariant) as <R, E, A>(
  fx: readonly Fx.Fx<R, E, A>[],
) => Fx.Fx<R, E, readonly A[]>

export const forEachRecord = R.forEach<FxHKT>(IdentityBothCovariant) as <A, R, E, B>(
  f: (a: A) => Fx.Fx<R, E, B>,
) => <K extends string>(record: R.ReadonlyRecord<K, A>) => Fx.Fx<R, E, R.ReadonlyRecord<K, B>>

export const forEachMap = M.forEach<FxHKT>(IdentityBothCovariant) as <A, R, E, B>(
  f: (a: A) => Fx.Fx<R, E, B>,
) => <K>(map: ReadonlyMap<K, A>) => Fx.Fx<R, E, ReadonlyMap<K, B>>

export const forEachSet = S.forEach<FxHKT>(IdentityBothCovariant) as <A, R, E, B>(
  f: (a: A) => Fx.Fx<R, E, B>,
) => (set: ReadonlySet<A>) => Fx.Fx<R, E, ReadonlySet<B>>

export const sequenceSet = S.sequence<FxHKT>(IdentityBothCovariant) as <R, E, A>(
  set: ReadonlySet<Fx.Fx<R, E, A>>,
) => Fx.Fx<R, E, ReadonlySet<A>>

export const AssociativeEither: AE.AssociativeEither3<FxHKT> = {
  either:
    <R, E, B>(s: Fx.Fx<R, E, B>) =>
    <A>(f: Fx.Fx<R, E, A>) =>
      Fx.Fx(function* () {
        const fe = yield* Fx.attempt(f)

        if (isRight(fe)) {
          return Left(fe.right)
        }

        const se = yield* Fx.attempt(s)

        if (isRight(se)) {
          return Right(se.right)
        }

        return yield* Fx.fromCause(new Sequential(fe.left, se.left))
      }),
}

export const either = AssociativeEither.either
export const eventually = AE.eventually<FxHKT>({ ...AssociativeEither, ...Covariant })
export const orElse = AE.orElse<FxHKT>({ ...AssociativeEither, ...Covariant })

export const Bottom: Bottom3<FxHKT> = {
  bottom: Fx.async(() => Left(Fx.unit)),
}

export const bottom = Bottom.bottom
export const never = bottom

export const IdentityEither: IdentityEither3<FxHKT> = {
  ...AssociativeEither,
  ...Bottom,
}

export const CommutativeEither: CE.CommutativeEither3<FxHKT> = {
  either: (s) => (f) => Fx.raceAll([pipe(f, map(Left)), pipe(s, map(Right))]),
}

export const raceEither = AssociativeEither.either
export const race = AE.tuple

export const IdentityEitherPar: IdentityEither3<FxHKT> = {
  ...CommutativeEither,
  ...Bottom,
}

export const makeAssociative = <R, E, A>(A: Associative<A>): Associative<Fx.Fx<R, E, A>> => ({
  concat: (f, s) =>
    pipe(
      Fx.zipAll([f, s]),
      map(([a, b]) => A.concat(a, b)),
    ),
})

export const makeIdentity = <R, E, A>(A: Identity<A>): Identity<Fx.Fx<R, E, A>> => ({
  ...makeAssociative(A),
  id: Fx.success(A.id),
})

export const makeEitherIdentity = fromIdentityEitherCovariant<FxHKT>({
  ...IdentityEither,
  ...Covariant,
})

export const makeEitherIdentityPar = fromIdentityEitherCovariant<FxHKT>({
  ...IdentityEitherPar,
  ...Covariant,
})
