import * as Effect from '@effect/core/io/Effect'
import { flow } from '@fp-ts/data/Function'
import { Duration } from '@tsplus/stdlib/data/Duration'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'

export function delay(duration: Duration) {
  return <R, E, A, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, A, E1> =>
    Stream((sink) =>
      stream.run(Sink(flow(sink.event, Effect.delay(duration)), sink.error, sink.end)),
    )
}
