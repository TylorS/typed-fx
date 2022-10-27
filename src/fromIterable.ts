import * as Effect from '@effect/core/io/Effect'

import { Emitter, Push } from './Push.js'

export function fromIterable<A>(iterable: Iterable<A>): Push<never, never, A> {
  return new FromIterable(iterable)
}

export class FromIterable<A> implements Push<never, never, A> {
  constructor(readonly iterable: Iterable<A>) {}

  run<R2>(emitter: Emitter<R2, never, A>) {
    return Effect.zipRight(emitter.end)(Effect.forEachDiscard(this.iterable, emitter.emit))
  }
}
