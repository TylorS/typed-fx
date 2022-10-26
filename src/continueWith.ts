import * as Effect from '@effect/core/io/Effect'

import { Emitter, Push } from './Push.js'
import { succeed } from './fromEffect.js'

export function continueWith<R2, E2, B>(f: () => Push<R2, E2, B>) {
  return <R, E, A>(push: Push<R, E, A>): Push<R | R2, E | E2, A | B> =>
    Push((emitter) =>
      push.run(
        Emitter(
          emitter.emit,
          emitter.failCause,
          Effect.suspendSucceed(() => f().run(emitter)),
        ),
      ),
    )
}

export function startWith<B>(value: B) {
  return <R, E, A>(push: Push<R, E, A>): Push<R, E, B | A> =>
    continueWith(() => push)(succeed(value))
}
