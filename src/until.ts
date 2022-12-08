import { Effect, Fiber, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function until<R2, E2, B>(signal: Fx<R2, E2, B>) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> => until_(fx, signal)
}

function until_<R, E, A, R2, E2, B>(fx: Fx<R, E, A>, signal: Fx<R2, E2, B>): Fx<R | R2, E | E2, A> {
  return Fx((emitter) =>
    pipe(
      signal.run(Emitter(() => exitEarly, emitter.failCause, exitEarly)),
      Effect.forkScoped,
      Effect.flatMap((fiber) =>
        pipe(
          fx.run(emitter),
          Effect.forkScoped,
          Effect.flatMap((fiber2) => Fiber.joinAll([fiber, fiber2])),
        ),
      ),
      onEarlyExitFailure(emitter.end),
    ),
  )
}
