import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { FiberId } from '@effect/core/io/FiberId'
import { pipe } from '@fp-ts/data/Function'
import { HashSet } from '@tsplus/stdlib/collections/HashSet'

import { Fx } from './Fx.js'

export const onDone =
  <E, R1, X1, R2, X2>(
    error: (e: E) => Effect.Effect<R1, never, X1>,
    success: (a: unknown) => Effect.Effect<R2, never, X2>,
  ) =>
  <R, A>(fx: Fx<R, E, A>): Fx<R | R1 | R2, E, A> =>
    Fx((emitter) => pipe(fx.run(emitter), Effect.onDone(error, success)))

export const onDoneCause =
  <E, R1, X1, R2, X2>(
    error: (e: Cause<E>) => Effect.Effect<R1, never, X1>,
    success: (a: unknown) => Effect.Effect<R2, never, X2>,
  ) =>
  <R, A>(fx: Fx<R, E, A>): Fx<R | R1 | R2, E, A> =>
    Fx((emitter) => pipe(fx.run(emitter), Effect.onDoneCause(error, success)))

export const onTermination =
  <R1, X1>(error: (e: Cause<never>) => Effect.Effect<R1, never, X1>) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R | R1, E, A> =>
    Fx((emitter) => pipe(fx.run(emitter), Effect.onTermination(error)))

export const onInterrupt =
  <R2, X>(cleanup: (fiberIds: HashSet<FiberId>) => Effect.Effect<R2, never, X>) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R | R2, E, A> =>
    Fx((emitter) => pipe(fx.run(emitter), Effect.onInterrupt(cleanup)))
