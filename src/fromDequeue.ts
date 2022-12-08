import { Effect, Queue } from 'effect'

import { Fx } from './Fx.js'

export function fromDequeue<A>(dequeue: Queue.Dequeue<A>): Fx<never, never, A> {
  return Fx((emitter) =>
    Effect.gen(function* ($) {
      while (!(yield* $(dequeue.isShutdown()))) {
        const a = yield* $(dequeue.take())
        yield* $(emitter.emit(a))
      }

      yield* $(emitter.end)
    }),
  )
}
