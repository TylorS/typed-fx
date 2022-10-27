import * as Effect from '@effect/core/io/Effect'
import { flow } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { Emitter, Fx } from './Fx.js'
import { succeed } from './fromEffect.js'

export function delay(duration: Duration.Duration) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    Fx((emitter) =>
      fx.run(Emitter(flow(emitter.emit, Effect.delay(duration)), emitter.failCause, emitter.end)),
    )
}

export function at(duration: Duration.Duration) {
  return flow(succeed, delay(duration))
}
