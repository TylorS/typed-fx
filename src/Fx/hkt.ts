import { Either, HKT3, Params, Variance, pipe } from 'hkt-ts'
import { Left } from 'hkt-ts/Either'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as AE from 'hkt-ts/Typeclass/AssociativeEither'
import * as B from 'hkt-ts/Typeclass/Bicovariant'
import { Bottom3 } from 'hkt-ts/Typeclass/Bottom'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import * as IE from 'hkt-ts/Typeclass/IdentityEither'
import * as T from 'hkt-ts/Typeclass/Top'

import { Fx } from './Fx'
import { async } from './InstructionSet/Async'
import { fork } from './InstructionSet/Fork'
import { fromExit, success, unit } from './InstructionSet/FromExit'
import { result } from './result'

import { zipAll } from './index'

import * as Exit from '@/Exit/index'
import { pending } from '@/Future/Future'
import { complete } from '@/Future/complete'
import { wait } from '@/Future/wait'

export interface FxHKT extends HKT3 {
  readonly type: Fx<this[Params.R], this[Params.E], this[Params.A]>
  readonly defaults: {
    [Params.R]: Variance.Covariant<any>
    [Params.E]: Variance.Covariant<any>
    [Params.A]: Variance.Covariant<any>
  }
}

export const Bicovariant: B.Bicovariant3<FxHKT> = {
  bimap: (f, g) => (fx) =>
    Fx(function* () {
      return yield* fromExit(pipe(yield* result(fx), Exit.bimap(f, g)))
    }),
}

export const bimap = Bicovariant.bimap
export const mapLeft = B.mapLeft(Bicovariant)
export const map = B.map(Bicovariant)

export const Covariant: C.Covariant3<FxHKT> = {
  map,
}

export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const Top: T.Top3<FxHKT> = {
  top: success([]),
}

export const Bottom: Bottom3<FxHKT> = {
  bottom: async<never, never, never>(() => Left(unit)),
}

export const bottom = Bottom.bottom

export const AssociativeBoth: AB.AssociativeBoth3<FxHKT> = {
  both: (s) => (f) => zipAll(f, s),
}

export const both = AB.both
export const zipLeft = AB.zipLeft<FxHKT>({ ...AssociativeBoth, ...Covariant })
export const zipRight = AB.zipRight<FxHKT>({ ...AssociativeBoth, ...Covariant })

export const IdentityBoth: IB.IdentityBoth3<FxHKT> = {
  ...Top,
  ...AssociativeBoth,
}

export const struct = IB.struct<FxHKT>({ ...IdentityBoth, ...Covariant })
export const tuple = IB.tuple<FxHKT>({ ...IdentityBoth, ...Covariant })

export const AssociativeEither: AE.AssociativeEither3<FxHKT> = {
  either:
    <R, E, B>(s: Fx<R, E, B>) =>
    <A>(f: Fx<R, E, A>) =>
      Fx(function* () {
        const future = pending<Either.Either<A, B>, never, E>()
        const ff = yield* fork(f)
        const sf = yield* fork(s)

        const fc = yield* ff.context
        const sc = yield* sf.context

        // Ensure closing one closes the other
        yield* fc.scope.addFinalizer((exit) =>
          Fx(function* () {
            yield* sc.scope.close(exit)

            complete(fromExit(exit))(future)
          }),
        )
        yield* sc.scope.addFinalizer((exit) =>
          Fx(function* () {
            yield* sc.scope.close(exit)

            complete(fromExit(exit))(future)
          }),
        )

        return yield* wait(future)
      }),
}

export const either = AssociativeEither.either
export const eventually = AE.eventually<FxHKT>({ ...AssociativeEither, ...Covariant })
export const orElse = AE.orElse<FxHKT>({ ...AssociativeEither, ...Covariant })
export const race = AE.tuple<FxHKT>({ ...AssociativeEither, ...Covariant })

export const IdentityEither: IE.IdentityEither3<FxHKT> = {
  ...AssociativeEither,
  ...Bottom,
}
