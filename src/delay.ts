import * as Effect from '@effect/core/io/Effect'
import { flow } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { fromEffect } from './fromEffect.js'

export function delay(delayDuration: Duration.Duration) {
  return <R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, A, E1> =>
    Fx((sink) => fx.run(Sink(flow(sink.event, Effect.delay(delayDuration)), sink.error, sink.end)))
}

export function at(delayDuration: Duration.Duration) {
  return <A>(value: A) => fromEffect(Effect.delay(delayDuration)(Effect.succeed(value)))
}
