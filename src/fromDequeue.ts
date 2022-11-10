import * as Effect from '@effect/core/io/Effect'
import * as Q from '@effect/core/io/Queue'

import { Fx } from './Fx.js'

export function fromDequeue<A>(dequeue: Q.Dequeue<A>): Fx<never, never, A> {
  return Fx((emitter) =>
    Effect.gen(function* ($) {
      while (!(yield* $(dequeue.isShutdown))) {
        const a = yield* $(dequeue.take)
        yield* $(emitter.emit(a))
      }

      yield* $(emitter.end)
    }),
  )
}
