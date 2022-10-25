import * as Effect from '@effect/core/io/Effect'
import { flow } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { Push } from './Push.js'

export function delay(duration: Duration.Duration) {
  return <R, E, A>(push: Push<R, E, A>): Push<R, E, A> =>
    Push((emitter) =>
      push.run({
        emit: flow(Effect.succeed, Effect.delay(duration), Effect.flatMap(emitter.emit)),
        failCause: emitter.failCause,
        end: emitter.end,
      }),
    )
}
