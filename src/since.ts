import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { AtomicReference } from '@tsplus/stdlib/data/AtomicReference'

import { Emitter, Fx } from './Fx.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function since<R2, E2, B>(signal: Fx<R2, E2, B>) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> => since_(fx, signal)
}

function since_<R, E, A, R2, E2, B>(fx: Fx<R, E, A>, signal: Fx<R2, E2, B>): Fx<R | R2, E | E2, A> {
  return Fx((emitter) =>
    pipe(
      Effect.sync(() => new AtomicReference(false)),
      Effect.tap((ref) =>
        pipe(
          signal.run(Emitter(() => exitEarly, emitter.failCause, Effect.unit)),
          onEarlyExitFailure(Effect.sync(() => ref.set(true))),
          Effect.forkScoped,
        ),
      ),
      Effect.flatMap((ref) =>
        fx.run(
          Emitter((a) => (ref.get ? emitter.emit(a) : Effect.unit), emitter.failCause, emitter.end),
        ),
      ),
    ),
  )
}
