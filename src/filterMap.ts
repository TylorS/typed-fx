import * as Effect from '@effect/core/io/Effect'
import { Scope } from '@effect/core/io/Scope'
import { flow } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Push } from './Push.js'

export const map =
  <A, B>(f: (a: A) => B) =>
  <R, E>(push: Push<R, E, A>): Push<R, E, B> =>
    Push((emitter) => push.run(Emitter(flow(f, emitter.emit), emitter.failCause, emitter.end)))

export const as = <B>(value: B): (<R, E, A>(push: Push<R, E, A>) => Push<R, E, B>) =>
  map(() => value)

export class Map<R, E, A, B> implements Push<R, E, B> {
  constructor(readonly push: Push<R, E, A>, readonly f: (a: A) => B) {}

  run<R2>(emitter: Emitter<R2, E, B>): Effect.Effect<R | R2 | Scope, never, unknown> {
    return this.push.run(Emitter(flow(this.f, emitter.emit), emitter.failCause, emitter.end))
  }

  static make = <R, E, A, B>(push: Push<R, E, A>, f: (a: A) => B): Push<R, E, B> => {
    if (push instanceof Map) {
      return new Map(push.push, flow(push.f, f))
    }

    return new Map(push, f)
  }
}

export function filterMap<A, B>(f: (a: A) => Maybe.Maybe<B>) {
  return <R, E>(push: Push<R, E, A>): Push<R, E, B> => FilterMap.make(push, f)
}

export class FilterMap<R, E, A, B> implements Push<R, E, B> {
  constructor(readonly push: Push<R, E, A>, readonly f: (a: A) => Maybe.Maybe<B>) {}

  run<R2>(emitter: Emitter<R2, E, B>): Effect.Effect<R | R2 | Scope, never, unknown> {
    return this.push.run(
      Emitter(
        flow(
          this.f,
          Maybe.fold(() => Effect.unit, emitter.emit),
        ),
        emitter.failCause,
        emitter.end,
      ),
    )
  }

  static make<R, E, A, B>(push: Push<R, E, A>, f: (a: A) => Maybe.Maybe<B>): Push<R, E, B> {
    if (push instanceof Map) {
      return new FilterMap(push.push, flow(push.f, f))
    }

    return new FilterMap(push, f)
  }
}
