import * as Effect from '@effect/core/io/Effect'

import { Emitter, Fx } from './Fx.js'
import { succeed } from './fromEffect.js'

export function continueWith<R2, E2, B>(f: () => Fx<R2, E2, B>) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A | B> =>
    Fx((emitter) =>
      fx.run(
        Emitter(
          emitter.emit,
          emitter.failCause,
          Effect.suspendSucceed(() => f().run(emitter)),
        ),
      ),
    )
}

export function startWith<B>(value: B) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, B | A> => continueWith(() => fx)(succeed(value))
}
