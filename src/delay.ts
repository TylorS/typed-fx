import * as Effect from '@effect/core/io/Effect'
import { flow } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { Emitter, Push } from './Push.js'
import { succeed } from './fromEffect.js'

export function delay(duration: Duration.Duration) {
  return <R, E, A>(push: Push<R, E, A>): Push<R, E, A> =>
    Push((emitter) =>
      push.run(Emitter(flow(emitter.emit, Effect.delay(duration)), emitter.failCause, emitter.end)),
    )
}

export function at(duration: Duration.Duration) {
  return <A>(value: A) => delay(duration)(succeed(value))
}
