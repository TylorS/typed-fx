import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function since<R2, E2, B>(signal: Fx<R2, E2, B>) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> => since_(fx, signal)
}

function since_<R, E, A, R2, E2, B>(fx: Fx<R, E, A>, signal: Fx<R2, E2, B>): Fx<R | R2, E | E2, A> {
  return Fx((emitter) =>
    pipe(
      Ref.makeRef<boolean>(() => false),
      Effect.tap((ref) =>
        pipe(
          signal.run(Emitter(() => exitEarly, emitter.failCause, exitEarly)),
          onEarlyExitFailure(ref.set(true)),
          Effect.forkScoped,
        ),
      ),
      Effect.flatMap((ref) =>
        fx.run(
          Emitter(
            (a) =>
              pipe(
                ref.get,
                Effect.flatMap((started) => (started ? emitter.emit(a) : Effect.unit)),
              ),
            emitter.failCause,
            emitter.end,
          ),
        ),
      ),
    ),
  )
}
