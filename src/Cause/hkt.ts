import { HKT, Params } from 'hkt-ts'
import * as C from 'hkt-ts/Typeclass/Covariant'

import {
  Cause,
  Died,
  Empty,
  Failed,
  Interrupted,
  Parallel,
  Sequential,
  ShouldPrintStack,
  Traced,
  match,
} from './Cause'

export interface CauseHKT extends HKT {
  readonly type: Cause<this[Params.A]>
}

export const Covariant: C.Covariant1<CauseHKT> = {
  map: function map<A, B>(f: (a: A) => B): (cause: Cause<A>) => Cause<B> {
    return match(
      () => Empty,
      (id, trace) => new Interrupted(id, trace),
      (error, trace) => new Died(error, trace),
      (e, trace) => new Failed(f(e), trace),
      (left, right) => new Sequential(map(f)(left), map(f)(right)),
      (left, right) => new Parallel(map(f)(left), map(f)(right)),
      (cause, shouldPrintStack) => new ShouldPrintStack(map(f)(cause), shouldPrintStack),
      (cause, trace) => new Traced(map(f)(cause), trace),
    )
  },
}

export const map = Covariant.map
export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)
