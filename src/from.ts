import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { Collection } from '@tsplus/stdlib/collections/Collection'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export function from<A>(collection: Collection<A>): Fx<never, never, A> {
  return new FromCollectionFx(collection)
}

export class FromCollectionFx<A> implements Fx<never, never, A> {
  constructor(readonly collection: Collection<A>) {}

  run<R2, E2, B>(sink: Sink<never, A, R2, E2, B>): Effect.Effect<R2, E2, B> {
    return pipe(Effect.forEachDiscard(this.collection, sink.event), Effect.zipRight(sink.end))
  }
}
