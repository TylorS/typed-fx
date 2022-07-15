import { HKT2, Params, flow, pipe } from 'hkt-ts'
import { Left, Right, match } from 'hkt-ts/Either'
import * as B from 'hkt-ts/Typeclass/Bicovariant'

import { Exit } from './Exit'

import * as Cause from '@/Cause/index'

export interface ExitHKT extends HKT2 {
  readonly type: Exit<this[Params.E], this[Params.A]>
}

export const Bicovariant: B.Bicovariant2<ExitHKT> = {
  bimap: (f, g) => (exit) => pipe(exit, match(flow(Cause.map(f), Left), flow(g, Right))),
}

export const bimap = Bicovariant.bimap
export const mapLeft = B.mapLeft(Bicovariant)
export const map = B.map(Bicovariant)
