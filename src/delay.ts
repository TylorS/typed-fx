import * as Effect from '@effect/core/io/Effect'
import { flow } from '@fp-ts/data/Function'
import { Duration } from '@tsplus/stdlib/data/Duration'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'
import { succeed } from './fromEffect.js'

export function delay(delayDuration: Duration) {
  return <R, E, A, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, A, E1> =>
    Stream((sink) =>
      stream.run(Sink(flow(sink.event, Effect.delay(delayDuration)), sink.error, sink.end)),
    )
}

export function at(delayDuration: Duration) {
  return <A>(value: A) => delay(delayDuration)(succeed(value))
}
