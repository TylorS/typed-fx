import { Cause, Effect, Either, Exit, Schedule, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'

/**
 * Schedules an Effect to run, emitting the result of the Effect to the emmiter
 */
export function scheduled<R2, Out>(schedule: Schedule.Schedule<R2, any, Out>) {
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Fx<R | R2, E, A> =>
    Fx(
      <R3>(emitter: Emitter<R3, E, A>): Effect.Effect<R | R2 | R3, never, unknown> =>
        Effect.gen(function* ($) {
          const driver = yield* $(
            pipe(
              schedule,
              Schedule.mapEffect(() =>
                pipe(effect, Effect.foldCauseEffect(emitter.failCause, emitter.emit)),
              ),
              Schedule.driver,
            ),
          )

          let exit = yield* $(Effect.exit(driver.next(undefined)))

          while (Exit.isSuccess(exit)) {
            exit = yield* $(Effect.exit(driver.next(exit.value)))
          }

          return yield* $(
            pipe(
              exit.cause,
              Cause.failureOrCause,
              Either.match(() => emitter.end, emitter.failCause),
            ),
          )
        }),
    )
}
