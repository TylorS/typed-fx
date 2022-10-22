import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import { Duration } from '@tsplus/stdlib/data/Duration'

import { Fx } from './Fx.js'

export function throttle(duration: Duration) {
  return <R, E, A, E1>(fx: Fx<R, E, A>): Fx<R, E, A, E1> =>
    Fx((sink) =>
      pipe(
        Ref.makeSynchronized<Fiber.Fiber<any, any> | null>(() => null),
        Effect.flatMap((ref) =>
          fx.run({
            ...sink,
            event: (a) =>
              ref.updateEffect((current) =>
                Effect.gen(function* (_) {
                  if (current) {
                    return current
                  }

                  const fiber: Fiber.Fiber<any, any> = yield* _(
                    pipe(
                      sink.event(a),
                      Effect.delay(duration),
                      Effect.onExit(() => ref.update((a) => (a === fiber ? null : a))),
                      Effect.fork,
                    ),
                  )

                  return fiber
                }),
              ),
          }),
        ),
        Effect.scoped,
      ),
    )
}
