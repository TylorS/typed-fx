import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import * as Schedule from '@effect/core/io/Schedule'
import { millis } from '@tsplus/stdlib/data/Duration'
import { isRight } from '@tsplus/stdlib/data/Either'

import { Emitter, Fx } from './Fx.js'

/**
 * Schedules an Effect to run, emitting the result of the Effect to the emmiter
 */
export function scheduled<S, R2, Out>(schedule: Schedule.Schedule<S, R2, any, Out>) {
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Fx<R | R2, E, A> =>
    Fx(
      <R3>(emitter: Emitter<R3, E, A>): Effect.Effect<R | R2 | R3, never, unknown> =>
        Effect.gen(function* ($) {
          const clock = yield* $(Effect.clock)

          let now = yield* $(clock.currentTime)
          let [s, , decision] = yield* $(schedule.step(now, undefined, schedule.initial))

          while (decision._tag === 'Continue') {
            yield* $(
              clock.sleep(millis((Schedule.Intervals.start(decision.intervals) - now) as any)),
            )

            const exit = yield* $(Effect.exit(effect))

            if (Exit.isFailure(exit)) {
              return yield* $(emitter.failCause(exit.cause))
            }

            yield* $(emitter.emit(exit.value))

            now = yield* $(clock.currentTime)
            const [s2, , decision2] = yield* $(schedule.step(now, exit.value, s))

            s = s2
            decision = decision2
          }

          return yield* $(emitter.end)
        }),
    )
}

/**
 * Schedules an Effect to run, emitting the result of the Schedule to the emmiter
 *
 * TODO: Needs a better name
 */
export function scheduledOut<S, R2, A, Out>(schedule: Schedule.Schedule<S, R2, A, Out>) {
  return <R, E>(effect: Effect.Effect<R, E, A>): Fx<R | R2, E, Out> =>
    Fx(<R3>(sink: Emitter<R3, E, Out>) =>
      Effect.gen(function* ($) {
        const d = yield* $(Schedule.driver(schedule))

        let inputExit = yield* $(Effect.exit(effect))

        if (Exit.isFailure(inputExit)) {
          return yield* $(sink.failCause(inputExit.cause))
        }

        let outputEither = yield* $(Effect.either(d.next(inputExit.value)))

        while (isRight(outputEither)) {
          inputExit = yield* $(Effect.exit(effect))

          if (Exit.isFailure(inputExit)) {
            return yield* $(sink.failCause(inputExit.cause))
          }

          outputEither = yield* $(Effect.either(d.next(inputExit.value)))
        }

        return yield* $(sink.end)
      }),
    )
}
