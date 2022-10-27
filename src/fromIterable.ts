import * as Effect from '@effect/core/io/Effect'

import { Emitter, Fx } from './Fx.js'

export function fromIterable<A>(iterable: Iterable<A>): Fx<never, never, A> {
  return new FromIterable(iterable)
}

export class FromIterable<A> implements Fx<never, never, A> {
  constructor(readonly iterable: Iterable<A>) {}

  run<R2>(emitter: Emitter<R2, never, A>) {
    return Effect.zipRight(emitter.end)(Effect.forEachDiscard(this.iterable, emitter.emit))
  }
}
