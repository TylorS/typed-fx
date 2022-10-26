import * as Cause from '@effect/core/io/Cause'
import { flow } from '@fp-ts/data/Function'

import { Emitter, Push } from './Push.js'

export function mapCause<E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) {
  return <R, A>(push: Push<R, E, A>): Push<R, E2, A> => mapCause_(push, f)
}

export function mapError<E, E2>(f: (error: E) => E2) {
  return <R, A>(push: Push<R, E, A>): Push<R, E2, A> => mapCause_(push, Cause.map(f))
}

function mapCause_<R, E, A, E2>(
  push: Push<R, E, A>,
  f: (cause: Cause.Cause<E>) => Cause.Cause<E2>,
) {
  return Push((emitter) => push.run(Emitter(emitter.emit, flow(f, emitter.failCause), emitter.end)))
}
