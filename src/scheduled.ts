import * as Effect from '@effect/core/io/Effect'
import { isFailure } from '@effect/core/io/Exit'
import * as Schedule from '@effect/core/io/Schedule'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

/**
 * Schedules an Effect to run, emitting the result of the Effect to the sink.
 */
export function scheduled<S, R2, Out>(schedule: Schedule.Schedule<S, R2, any, Out>) {
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Fx<R | R2, E, A> =>
    Fx(<R3, E3, B>(sink: Sink<E, A, R3, E3, B>) =>
      Effect.gen(function* ($) {
        const clock = yield* $(Effect.clock)

        let [s, , decision] = yield* $(
          schedule.step(yield* $(clock.currentTime), undefined, schedule.initial),
        )

        while (decision._tag === 'Continue') {
          const exit = yield* $(Effect.exit(effect))

          if (isFailure(exit)) {
            return yield* $(sink.error(exit.cause))
          }

          yield* $(sink.event(exit.value))

          const [s2, , decision2] = yield* $(
            schedule.step(yield* $(clock.currentTime), exit.value, s),
          )

          s = s2
          decision = decision2
        }

        return yield* $(sink.end)
      }),
    )
}

/**
 * Schedules an Effect to run, emitting the result of the Schedule to the sink.
 *
 * TODO: Needs a better name
 */
export function scheduledOut<S, R2, A, Out>(schedule: Schedule.Schedule<S, R2, A, Out>) {
  return <R, E>(effect: Effect.Effect<R, E, A>): Fx<R | R2, E, Out> =>
    Fx(<R3, E3, B>(sink: Sink<E, Out, R3, E3, B>) =>
      Effect.gen(function* ($) {
        const clock = yield* $(Effect.clock)

        let exit = yield* $(Effect.exit(effect))

        if (isFailure(exit)) {
          return yield* $(sink.error(exit.cause))
        }

        let [s, , decision] = yield* $(
          schedule.step(yield* $(clock.currentTime), exit.value, schedule.initial),
        )

        while (decision._tag === 'Continue') {
          exit = yield* $(Effect.exit(effect))

          if (isFailure(exit)) {
            return yield* $(sink.error(exit.cause))
          }

          const [s2, out, decision2] = yield* $(
            schedule.step(yield* $(clock.currentTime), exit.value, s),
          )

          yield* $(sink.event(out))

          s = s2
          decision = decision2
        }

        return yield* $(sink.end)
      }),
    )
}
