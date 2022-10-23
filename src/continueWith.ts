import * as Effect from '@effect/core/io/Effect'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { succeed } from './fromEffect.js'

export function continueWith<R2, E2, B, E3>(continueWith: () => Fx<R2, E2, B, E3>) {
  return <R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A | B, E1 | E3> =>
    Fx((sink) =>
      fx.run(
        Sink(
          sink.event,
          sink.error,
          Effect.suspendSucceed(() => continueWith().run(sink)),
        ),
      ),
    )
}

export function startWith<B>(value: B) {
  return <R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, A | B, E1> =>
    continueWith(() => fx)(succeed(value))
}
