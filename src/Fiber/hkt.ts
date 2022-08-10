import { Either, HKT2, Params, flow, pipe } from 'hkt-ts'
import { makeAssociative } from 'hkt-ts/Array'
import { ReadonlyRecord } from 'hkt-ts/Record'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as AE from 'hkt-ts/Typeclass/AssociativeEither'
import * as B from 'hkt-ts/Typeclass/Bicovariant'
import { Bottom2 } from 'hkt-ts/Typeclass/Bottom'
import * as CB from 'hkt-ts/Typeclass/CommutativeBoth'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import * as IE from 'hkt-ts/Typeclass/IdentityEither'
import { Top2 } from 'hkt-ts/Typeclass/Top'

import { Pending, wait } from '../Future/index.js'
import * as Fx from '../Fx/index.js'

import { AnyFiber, ErrorsOf, Fiber, OutputOf, Synthetic } from './Fiber.js'

import { Empty } from '@/Cause/Cause.js'
import * as Exit from '@/Exit/index.js'
import { makeSequentialAssociative } from '@/Exit/index.js'
import { FiberId } from '@/FiberId/FiberId.js'

export interface FiberHKT extends HKT2 {
  readonly type: Fiber<this[Params.E], this[Params.A]>
}

export const Bicovariant: B.Bicovariant2<FiberHKT> = {
  bimap: (f, g) => (fiber) =>
    Synthetic({
      id: new FiberId.Synthetic([fiber.id]),
      exit: Fx.Fx(function* () {
        return pipe(yield* fiber.exit, Exit.bimap(f, g))
      }),
      inheritFiberRefs: Fx.inheritFiberRefs(fiber),
    }),
}

export const bimap = Bicovariant.bimap
export const mapLeft = B.mapLeft(Bicovariant)
export const map = B.map(Bicovariant)

export const Covariant: C.Covariant2<FiberHKT> = {
  map,
}

export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const AssociativeBoth: AB.AssociativeBoth2<FiberHKT> = {
  both:
    <E, B>(s: Fiber<E, B>) =>
    <A>(f: Fiber<E, A>) =>
      Synthetic({
        id: new FiberId.Synthetic([f.id, s.id]),
        exit: Fx.Fx(function* () {
          const fe = yield* tupled(f).exit
          const se = yield* tupled(s).exit

          return makeSequentialAssociative<any, any>(makeAssociative<any>()).concat(
            fe,
            se,
          ) as Exit.Exit<E, readonly [A, B]>
        }),
        inheritFiberRefs: Fx.Fx(function* () {
          yield* Fx.inheritFiberRefs(f)
          yield* Fx.inheritFiberRefs(s)
        }),
      }),
}

export const bothSeq = AB.both
export const zipLeftSeq = AB.zipLeft<FiberHKT>({ ...AssociativeBoth, ...Covariant })
export const zipRightSeq = AB.zipRight<FiberHKT>({ ...AssociativeBoth, ...Covariant })

export const CommutativeBoth: CB.CommutativeBoth2<FiberHKT> = {
  both:
    <E, B>(s: Fiber<E, B>) =>
    <A>(f: Fiber<E, A>) =>
      Synthetic({
        id: new FiberId.Synthetic([f.id, s.id]),
        exit: Fx.Fx(function* () {
          const [fe, se] = yield* Fx.zipAll([f.exit, s.exit] as const)

          return makeSequentialAssociative<any, E>(makeAssociative<any>()).concat(
            Exit.tupled(fe),
            Exit.tupled(se),
          ) as Exit.Exit<E, readonly [A, B]>
        }),
        inheritFiberRefs: Fx.Fx(function* () {
          yield* Fx.inheritFiberRefs(f)
          yield* Fx.inheritFiberRefs(s)
        }),
      }),
}

export const both = CommutativeBoth.both
export const zipLeft = AB.zipLeft<FiberHKT>({ ...CommutativeBoth, ...Covariant })
export const zipRight = AB.zipRight<FiberHKT>({ ...CommutativeBoth, ...Covariant })

export function fromExit<E, A>(exit: Exit.Exit<E, A>): Synthetic<E, A> {
  return Synthetic({
    id: new FiberId.Synthetic([]),
    exit: Fx.success(exit),
    inheritFiberRefs: Fx.unit,
  })
}

export const Top: Top2<FiberHKT> = {
  top: fromExit(Either.Right(undefined)),
}

export const top = Top.top

export const empty = fromExit<never, never>(Either.Left(Empty))
export const die = flow(Exit.die, fromExit)
export const failure = flow(Exit.failure, fromExit)
export const interrupt = flow(Exit.interrupt, fromExit)
export const success = flow(Exit.success, fromExit)
export const fromEither = flow(Exit.fromEither, fromExit)

export const IdentityBoth: IB.IdentityBoth2<FiberHKT> = {
  ...Top,
  ...AssociativeBoth,
}

export const tuple = IB.tuple<FiberHKT>({ ...IdentityBoth, ...Covariant }) as <
  Fibers extends ReadonlyArray<AnyFiber>,
>(
  ...fibers: Fibers
) => Fiber<
  ErrorsOf<Fibers[number]>,
  {
    readonly [K in keyof Fibers]: OutputOf<Fibers[K]>
  }
>

export const struct = IB.struct<FiberHKT>({ ...IdentityBoth, ...Covariant }) as <
  Fibers extends ReadonlyRecord<string, AnyFiber>,
>(
  fibers: Fibers,
) => Fiber<
  ErrorsOf<Fibers[string]>,
  {
    readonly [K in keyof Fibers]: OutputOf<Fibers[K]>
  }
>

export const never: Fiber<never, never> = Synthetic({
  id: new FiberId.Synthetic([]),
  exit: wait(Pending()),
  inheritFiberRefs: Fx.unit,
})

export const Bottom: Bottom2<FiberHKT> = {
  bottom: never,
}

export const bottom = Bottom.bottom

export const AssociativeEither: AE.AssociativeEither2<FiberHKT> = {
  either:
    <E, B>(s: Fiber<E, B>) =>
    <A>(f: Fiber<E, A>) =>
      Synthetic<E, Either.Either<A, B>>({
        id: new FiberId.Synthetic([f.id, s.id]),
        exit: Fx.Fx(function* () {
          return pipe(
            yield* Fx.either(s.exit)(f.exit),
            Either.match(Exit.map(Either.Left), Exit.map(Either.Right)),
          )
        }),
        inheritFiberRefs: Fx.Fx(function* () {
          // Wait for an inherit the Refs of the winning Fiber
          return yield* pipe(
            yield* Fx.either(s.exit)(f.exit),
            Either.match(
              () => Fx.inheritFiberRefs(f),
              () => Fx.inheritFiberRefs(s),
            ),
          )
        }),
      }),
}

export const either = AE.either
export const orElse = AE.orElse<FiberHKT>({ ...AssociativeEither, ...Covariant })
export const race = AE.tuple<FiberHKT>({ ...AssociativeEither, ...Covariant }) as <
  Fibers extends ReadonlyArray<AnyFiber>,
>(
  ...fibers: Fibers
) => Fiber<ErrorsOf<Fibers[number]>, OutputOf<Fibers[number]>>

export const IdentityEither: IE.IdentityEither2<FiberHKT> = {
  ...AssociativeEither,
  ...Bottom,
}
