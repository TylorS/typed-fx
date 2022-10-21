import * as Effect from '@effect/core/io/Effect'
import { isFailure } from '@effect/core/io/Exit'
import * as Schedule from '@effect/core/io/Schedule'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

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
