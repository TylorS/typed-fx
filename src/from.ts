import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { Collection } from '@tsplus/stdlib/collections/Collection'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'

export function from<A>(collection: Collection<A>): Stream<never, never, A> {
  return new FromCollectionStream(collection)
}

export class FromCollectionStream<A> implements Stream<never, never, A> {
  constructor(readonly collection: Collection<A>) {}

  run<R2, E2, B>(sink: Sink<never, A, R2, E2, B>): Effect.Effect<R2, E2, B> {
    return pipe(Effect.forEach(this.collection, sink.event), Effect.zipRight(sink.end))
  }
}
