import { HKT2, Params, Variance, flow, pipe } from 'hkt-ts'
import * as Either from 'hkt-ts/Either'
import * as B from 'hkt-ts/Typeclass/Bicovariant'
// import { Bottom2 } from 'hkt-ts/Typeclass/Bottom'
import * as C from 'hkt-ts/Typeclass/Covariant'
import { Top2 } from 'hkt-ts/Typeclass/Top'

import type { Exit } from './Exit.js'

import * as Cause from '@/Cause/index.js'

export interface ExitHKT extends HKT2 {
  readonly type: Exit<this[Params.E], this[Params.A]>
  readonly defaults: {
    readonly [Params.E]: Variance.Covariant<unknown>
    readonly [Params.A]: Variance.Covariant<unknown>
  }
}

export const Bicovariant: B.Bicovariant2<ExitHKT> = {
  bimap: (f, g) => (exit) =>
    pipe(exit, Either.match(flow(Cause.map(f), Either.Left), flow(g, Either.Right))),
}

export const bimap = Bicovariant.bimap
export const mapLeft = B.mapLeft(Bicovariant)
export const map = B.map(Bicovariant)

export const Covariant: C.Covariant2<ExitHKT> = {
  map,
}

export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const Top = Either.Top as Top2<ExitHKT>
export const top = Top.top

// export const Bottom: Bottom2<ExitHKT> = {
//   bottom: Either.Left(Cause.Empty),
// }

// export const bottom = Bottom.bottom
