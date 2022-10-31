import * as Cause from '@effect/core/io/Cause'
import { flow } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'

export function mapCause<E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) {
  return <R, A>(fx: Fx<R, E, A>): Fx<R, E2, A> => mapCause_(fx, f)
}

export function mapError<E, E2>(f: (error: E) => E2) {
  return <R, A>(fx: Fx<R, E, A>): Fx<R, E2, A> => mapCause_(fx, Cause.map(f))
}

function mapCause_<R, E, A, E2>(
  fx: Fx<R, E, A>,
  f: (cause: Cause.Cause<E>) => Cause.Cause<E2>,
): Fx<R, E2, A> {
  return Fx((emitter) => fx.run(Emitter(emitter.emit, flow(f, emitter.failCause), emitter.end)))
}
