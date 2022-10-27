import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function until<R2, E2, B>(signal: Fx<R2, E2, B>) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> => until_(fx, signal)
}

function until_<R, E, A, R2, E2, B>(fx: Fx<R, E, A>, signal: Fx<R2, E2, B>): Fx<R | R2, E | E2, A> {
  return Fx((emitter) =>
    pipe(
      signal.run(Emitter(() => exitEarly, emitter.failCause, Effect.unit)),
      onEarlyExitFailure(emitter.end),
      Effect.forkScoped,
      Effect.flatMap(() => fx.run(emitter)),
    ),
  )
}
