import { HKT2, Params, pipe } from 'hkt-ts'
import { makeAssociative } from 'hkt-ts/Array'
import { Right } from 'hkt-ts/Either'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as B from 'hkt-ts/Typeclass/Bicovariant'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import { Top2 } from 'hkt-ts/Typeclass/Top'

import { Fx, inheritFiberRefs, success, unit } from '../Fx/Fx.js'
import { mainFiberContext } from '../Fx/run.js'

import { Fiber, Synthetic } from './Fiber.js'

import * as Exit from '@/Exit/index.js'
import { makeSequentialAssociative } from '@/Exit/index.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Time } from '@/Time/index.js'

export interface FiberHKT extends HKT2 {
  readonly type: Fiber<this[Params.E], this[Params.A]>
}

export const Bicovariant: B.Bicovariant2<FiberHKT> = {
  bimap: (f, g) => (fiber) =>
    Synthetic({
      id: bimapFiberId(fiber),
      exit: Fx(function* () {
        const e = yield* fiber.exit

        return pipe(e, Exit.bimap(f, g))
      }),
      inheritFiberRefs: inheritFiberRefs(fiber),
    }),
}

function bimapFiberId<E, A>(fiber: Fiber<E, A>): FiberId.Synthetic {
  return new FiberId.Synthetic([fiber.id], fiber.id.clock, fiber.id.clock.getCurrentTime())
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
        id: new FiberId.Synthetic([f.id, s.id], f.id.clock, f.id.clock.getCurrentTime()),
        exit: Fx(function* () {
          const fe = yield* tupled(f).exit
          const se = yield* tupled(s).exit

          return makeSequentialAssociative<any, any>(makeAssociative<any>()).concat(
            fe,
            se,
          ) as Exit.Exit<any, readonly [A, B]>
        }),
        inheritFiberRefs: Fx(function* () {
          yield* inheritFiberRefs(f)
          yield* inheritFiberRefs(s)
        }),
      }),
}

export const both = AB.both

export const zipLeft = AB.zipLeft<FiberHKT>({ ...AssociativeBoth, ...Covariant })
export const zipRight = AB.zipRight<FiberHKT>({ ...AssociativeBoth, ...Covariant })

export const Top: Top2<FiberHKT> = {
  top: Synthetic({
    id: new FiberId.Synthetic([FiberId.None], mainFiberContext.platform.timer, Time(0)),
    exit: success(Right(undefined)),
    inheritFiberRefs: unit,
  }),
}

export const IdentityBoth: IB.IdentityBoth2<FiberHKT> = {
  ...Top,
  ...AssociativeBoth,
}

export const tuple = IB.tuple<FiberHKT>({ ...IdentityBoth, ...Covariant })
export const struct = IB.struct<FiberHKT>({ ...IdentityBoth, ...Covariant })
