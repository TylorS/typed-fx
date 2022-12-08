import { Effect, Fiber, MutableRef, pipe } from 'effect'

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
      Effect.sync(() => MutableRef.make(false)),
      Effect.flatMap((ref) =>
        pipe(
          signal.run(
            Emitter(
              (endSignal) =>
                pipe(
                  Effect.sync(() => pipe(ref, MutableRef.set(true))),
                  Effect.flatMap(() =>
                    endSignal.run(Emitter(() => exitEarly, emitter.failCause, Effect.unit())),
                  ),
                ),
              emitter.failCause,
              Effect.unit(),
            ),
          ),
          Effect.forkScoped,
          Effect.flatMap((fiber) =>
            pipe(
              fx.run(
                Emitter(
                  (a) => (MutableRef.get(ref) ? emitter.emit(a) : Effect.unit()),
                  emitter.failCause,
                  exitEarly,
                ),
              ),
              Effect.forkScoped,
              Effect.flatMap((fiber2) => Fiber.joinAll([fiber, fiber2])),
              onEarlyExitFailure(emitter.end),
            ),
          ),
        ),
      ),
    ),
  )
}
