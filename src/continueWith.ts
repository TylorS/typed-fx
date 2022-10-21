import * as Effect from '@effect/core/io/Effect'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'
import { succeed } from './fromEffect.js'

export function continueWith<R2, E2, B, E3>(continueWith: () => Stream<R2, E2, B, E3>) {
  return <R, E, A, E1>(stream: Stream<R, E, A, E1>): Stream<R | R2, E | E2, A | B, E1 | E3> =>
    Stream((sink) =>
      stream.run(
        Sink(
          sink.event,
          sink.error,
          Effect.suspendSucceed(() => continueWith().run(sink)),
        ),
      ),
    )
}

export function startWith<B>(value: B) {
  return <R, E, A, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, A | B, E1> =>
    continueWith(() => stream)(succeed(value))
}
