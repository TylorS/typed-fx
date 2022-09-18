import { makeAssociative } from 'hkt-ts/Array'
import { HKT2, Params } from 'hkt-ts/HKT'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as B from 'hkt-ts/Typeclass/Bicovariant'
import { Bottom2 } from 'hkt-ts/Typeclass/Bottom'
import { CommutativeBoth2 } from 'hkt-ts/Typeclass/CommutativeBoth'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as IB from 'hkt-ts/Typeclass/IdentityBoth'
import { Top2 } from 'hkt-ts/Typeclass/Top'
import { flow, pipe } from 'hkt-ts/function'

import { Fiber, Synthetic, inheritFiberRefs } from './Fiber.js'
import { fromExit } from './fromExit.js'

import * as Exit from '@/Exit/index.js'
import * as FiberId from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/Fx.js'

export interface FiberHKT extends HKT2 {
  readonly type: Fiber<this[Params.E], this[Params.A]>
}

export const Bicovariant: B.Bicovariant2<FiberHKT> = {
  bimap: (f, g) => (fiber) =>
    Synthetic({
      id: FiberId.Synthetic([fiber.id]),
      exit: pipe(fiber.exit, Fx.map(Exit.bimap(f, g))),
      inheritFiberRefs: inheritFiberRefs(fiber),
      interruptAs: flow(fiber.interruptAs, Fx.map(Exit.bimap(f, g))),
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

export const Top: Top2<FiberHKT> = {
  top: fromExit(Exit.top),
}
export const top = Top.top

export const Bottom: Bottom2<FiberHKT> = {
  bottom: fromExit(Exit.bottom),
}
export const bottom = Bottom.bottom

const concatExitSeq = Exit.makeSequentialAssociative<any, any>(makeAssociative<any>()).concat

export const AssociativeBoth: AB.AssociativeBoth2<FiberHKT> = {
  both: (fb) => (fa) =>
    Synthetic({
      id: FiberId.Synthetic([fa.id, fb.id]),
      exit: pipe(
        Fx.zipAllSeq([fa.exit, fb.exit]),
        Fx.flatMap(([ea, eb]) => Fx.now(concatExitSeq(Exit.tupled(ea), Exit.tupled(eb)))),
      ),
      inheritFiberRefs: pipe(
        inheritFiberRefs(fa),
        Fx.flatMap(() => inheritFiberRefs(fb)),
      ),
      interruptAs: (id) =>
        pipe(
          Fx.zipAllSeq([fa.interruptAs(id), fb.interruptAs(id)]),
          Fx.map(([ea, eb]) => concatExitSeq(Exit.tupled(ea), Exit.tupled(eb))),
        ),
    }),
}

export const bothSeq = AssociativeBoth.both

export const zipLeftSeq = AB.zipLeft<FiberHKT>({ ...AssociativeBoth, ...Covariant })
export const zipRightSeq = AB.zipRight<FiberHKT>({ ...AssociativeBoth, ...Covariant })

const concatExitPar = Exit.makeParallelAssociative<any, any>(makeAssociative<any>()).concat

export const CommutativeBoth: CommutativeBoth2<FiberHKT> = {
  both: (fb) => (fa) =>
    Synthetic({
      id: FiberId.Synthetic([fa.id, fb.id]),
      exit: pipe(
        Fx.zipAll([fa.exit, fb.exit]),
        Fx.flatMap(([ea, eb]) => Fx.now(concatExitPar(Exit.tupled(ea), Exit.tupled(eb)))),
      ),
      inheritFiberRefs: pipe(
        inheritFiberRefs(fa),
        Fx.flatMap(() => inheritFiberRefs(fb)),
      ),
      interruptAs: (id) =>
        pipe(
          Fx.zipAll([fa.interruptAs(id), fb.interruptAs(id)]),
          Fx.map(([ea, eb]) => concatExitPar(Exit.tupled(ea), Exit.tupled(eb))),
        ),
    }),
}

export const both = CommutativeBoth.both
export const zipLeft = AB.zipLeft<FiberHKT>({ ...CommutativeBoth, ...Covariant })
export const zipRight = AB.zipRight<FiberHKT>({ ...CommutativeBoth, ...Covariant })

export const IdentityBothSeq: IB.IdentityBoth2<FiberHKT> = {
  ...AssociativeBoth,
  ...Top,
}

export const tupleSeq = IB.tuple<FiberHKT>({ ...IdentityBothSeq, ...Covariant })
export const structSeq = IB.struct<FiberHKT>({ ...IdentityBothSeq, ...Covariant })

export const IdentityBothPar: IB.IdentityBoth2<FiberHKT> = {
  ...CommutativeBoth,
  ...Top,
}

export const tuple = IB.tuple<FiberHKT>({ ...IdentityBothPar, ...Covariant })
export const struct = IB.struct<FiberHKT>({ ...IdentityBothPar, ...Covariant })

// TODO: More Typeclass instances
