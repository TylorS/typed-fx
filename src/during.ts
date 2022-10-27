import * as Effect from '@effect/core/io/Effect'
import { joinAll } from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function during<R2, E2, R3, E3, B>(signal: Fx<R2, E2, Fx<R3, E3, B>>) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R | R2 | R3, E | E2 | E3, A> => during_(fx, signal)
}

function during_<R, E, A, R2, E2, R3, E3, B>(
  fx: Fx<R, E, A>,
  signal: Fx<R2, E2, Fx<R3, E3, B>>,
): Fx<R | R2 | R3, E | E2 | E3, A> {
  return Fx((emitter) =>
    pipe(
      Ref.makeRef<boolean>(() => false),
      Effect.flatMap((ref) =>
        pipe(
          signal.run(
            Emitter(
              (endSignal) =>
                pipe(
                  ref.set(true),
                  Effect.zipRight(
                    endSignal.run(Emitter(() => exitEarly, emitter.failCause, exitEarly)),
                  ),
                ),
              emitter.failCause,
              Effect.unit,
            ),
          ),
          Effect.forkScoped,
          Effect.flatMap((fiber) =>
            pipe(
              fx.run(
                Emitter(
                  (a) =>
                    pipe(
                      ref.get,
                      Effect.flatMap((started) => (started ? emitter.emit(a) : Effect.unit)),
                    ),
                  emitter.failCause,
                  exitEarly,
                ),
              ),
              Effect.forkScoped,
              Effect.flatMap((fiber2) => joinAll([fiber, fiber2])),
              onEarlyExitFailure(emitter.end),
            ),
          ),
        ),
      ),
    ),
  )
}
