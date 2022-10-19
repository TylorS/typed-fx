import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { Collection } from '@tsplus/stdlib/collections/Collection'

import { Stream } from './Stream.js'

export function from<A>(collection: Collection<A>): Stream<never, never, A> {
  return Stream<never, never, A>((sink) =>
    pipe(
      Effect.forEachParDiscard(collection, sink.event),
      Effect.flatMap(() => sink.end),
      Effect.fork,
    ),
  )
}
