import * as Effect from '@effect/core/io/Effect'

import { Push } from './Push.js'

export function fromIterable<A>(iterable: Iterable<A>): Push<never, never, A> {
  return Push((emitter) =>
    Effect.zipRight(emitter.end)(Effect.forEachDiscard(iterable, emitter.emit)),
  )
}
