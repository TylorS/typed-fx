import { HKT, Params, pipe } from 'hkt-ts'
import { Covariant1 } from 'hkt-ts/Typeclass/Covariant'

import {
  Cause,
  Died,
  Empty,
  Failed,
  Interrupted,
  Parallel,
  Sequential,
  ShouldPrintStack,
  match,
} from './Cause'

export interface CauseHKT extends HKT {
  readonly type: Cause<this[Params.A]>
}

export const Covariant: Covariant1<CauseHKT> = {
  map: function map<A, B>(f: (a: A) => B): (cause: Cause<A>) => Cause<B> {
    return (cause) =>
      pipe(
        cause,
        match(
          (): Cause<B> => Empty,
          (id, trace): Cause<B> => new Interrupted(id, trace),
          (error, trace): Cause<B> => new Died(error, trace),
          (e, trace): Cause<B> => new Failed(f(e), trace),
          (left, right): Cause<B> => new Sequential(map(f)(left), map(f)(right)),
          (left, right): Cause<B> => new Parallel(map(f)(left), map(f)(right)),
          (cause, shouldPrintStack): Cause<B> =>
            new ShouldPrintStack(map(f)(cause), shouldPrintStack),
        ),
      )
  },
}

export const map = Covariant.map
