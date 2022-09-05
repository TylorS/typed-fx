import { HKT2, Params, flow, pipe } from 'hkt-ts'
import { Left, Right, match } from 'hkt-ts/Either'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import * as AE from 'hkt-ts/Typeclass/AssociativeEither'
import * as B from 'hkt-ts/Typeclass/Bicovariant'
import { Bottom2 } from 'hkt-ts/Typeclass/Bottom'
import * as C from 'hkt-ts/Typeclass/Covariant'
import { Top2 } from 'hkt-ts/Typeclass/Top'

import { Exit } from './Exit.js'

import * as Cause from '@/Cause/index.js'

export interface ExitHKT extends HKT2 {
  readonly type: Exit<this[Params.E], this[Params.A]>
}

export const Bicovariant: B.Bicovariant2<ExitHKT> = {
  bimap: (f, g) => (exit) => pipe(exit, match(flow(Cause.map(f), Left), flow(g, Right))),
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

export const Top: Top2<ExitHKT> = {
  top: Right([]),
}

export const Bottom: Bottom2<ExitHKT> = {
  bottom: Left(Cause.Empty),
}

const CauseSeqId = Cause.makeSequentialIdentity<any>()

export const AssociativeBothSeq: AB.AssociativeBoth2<ExitHKT> = {
  both: (exit2) => (exit) =>
    pipe(
      exit,
      match(
        (cause1) =>
          pipe(
            exit2,
            match(
              (cause2) => Left(CauseSeqId.concat(cause1, cause2)),
              () => Left(cause1),
            ),
          ),
        (a) =>
          pipe(
            exit2,
            match(
              (cause2) => Left(cause2),
              (b) => Right([a, b] as const),
            ),
          ),
      ),
    ),
}

const CauseParId = Cause.makeParallelIdentity<any>()

export const AssociativeBothPar: AB.AssociativeBoth2<ExitHKT> = {
  both: (exit2) => (exit) =>
    pipe(
      exit,
      match(
        (cause1) =>
          pipe(
            exit2,
            match(
              (cause2) => Left(CauseParId.concat(cause1, cause2)),
              () => Left(cause1),
            ),
          ),
        (a) =>
          pipe(
            exit2,
            match(
              (cause2) => Left(cause2),
              (b) => Right([a, b] as const),
            ),
          ),
      ),
    ),
}

export const AssociativeEitherSeq: AE.AssociativeEither2<ExitHKT> = {
  either: (exit2) => (exit) =>
    pipe(
      exit,
      match(
        (cause1) =>
          pipe(
            exit2,
            match((cause2) => Left(CauseSeqId.concat(cause1, cause2)), flow(Right, Right)),
          ),
        flow(Left, Right),
      ),
    ),
}

export const AssociativeEitherPar: AE.AssociativeEither2<ExitHKT> = {
  either: (exit2) => (exit) =>
    pipe(
      exit,
      match(
        (cause1) =>
          pipe(
            exit2,
            match((cause2) => Left(CauseSeqId.concat(cause1, cause2)), flow(Right, Right)),
          ),
        flow(Left, Right),
      ),
    ),
}
