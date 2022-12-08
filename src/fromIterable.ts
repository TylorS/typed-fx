import { Effect } from 'effect'

import { Emitter, Fx } from './Fx.js'

export function fromIterable<A>(iterable: Iterable<A>): Fx<never, never, A> {
  return new FromIterable(iterable)
}

export class FromIterable<A> implements Fx<never, never, A> {
  readonly _R!: () => never
  readonly _E!: () => never
  readonly _A!: () => A

  constructor(readonly iterable: Iterable<A>) {}

  run<R2>(emitter: Emitter<R2, never, A>) {
    return Effect.zipRight(emitter.end)(Effect.forEachDiscard(emitter.emit)(this.iterable))
  }
}
