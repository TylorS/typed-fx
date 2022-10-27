import * as Effect from '@effect/core/io/Effect'
import { Scope } from '@effect/core/io/Scope'
import { pipe } from '@tsplus/stdlib/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Push } from './Push.js'
import { startWith } from './continueWith.js'
import { FilterMap, Map } from './filterMap.js'

export function loop<A, B, C>(seed: A, f: (a: A, b: B) => readonly [A, C]) {
  return <R, E>(push: Push<R, E, B>): Push<R, E, C> => Loop.make(push, seed, f)
}

export function scan<A, B>(seed: A, f: (a: A, b: B) => A) {
  return <R, E>(push: Push<R, E, B>): Push<R, E, A> =>
    pipe(
      push,
      loop(seed, (a, b) => {
        const c = f(a, b)
        return [c, c]
      }),
      startWith(seed),
    )
}

export function filterLoop<A, B, C>(seed: A, f: (a: A, b: B) => Maybe.Maybe<readonly [A, C]>) {
  return <R, E>(push: Push<R, E, B>): Push<R, E, C> => FilterLoop.make(push, seed, f)
}

export function filterScan<A, B>(seed: A, f: (a: A, b: B) => Maybe.Maybe<A>) {
  return <R, E>(push: Push<R, E, B>): Push<R, E, A> =>
    pipe(
      push,
      filterLoop(seed, (a, b) =>
        pipe(
          f(a, b),
          Maybe.map((c) => [c, c]),
        ),
      ),
      startWith(seed),
    )
}

export class Loop<R, E, A, B, C> implements Push<R, E, C> {
  constructor(
    readonly push: Push<R, E, B>,
    readonly seed: A,
    readonly f: (a: A, b: B) => readonly [A, C],
  ) {}

  run<R2>(emitter: Emitter<R2, E, C>): Effect.Effect<R | R2 | Scope, never, unknown> {
    return Effect.suspendSucceed(() => {
      let acc = this.seed

      return this.push.run(
        Emitter(
          (b: B) => {
            const [a, c] = this.f(acc, b)

            acc = a

            return emitter.emit(c)
          },
          emitter.failCause,
          emitter.end,
        ),
      )
    })
  }

  static make<R, E, A, B, C>(
    push: Push<R, E, B>,
    seed: A,
    f: (a: A, b: B) => readonly [A, C],
  ): Push<R, E, C> {
    if (push instanceof FilterMap) {
      return FilterLoop.make(push.push, seed, (a, x) =>
        pipe(
          x,
          push.f,
          Maybe.map((b) => f(a, b)),
        ),
      )
    }

    if (push instanceof Map) {
      return Loop.make(push.push, seed, (a, x) => f(a, push.f(x)))
    }

    return new Loop(push, seed, f)
  }
}

export class FilterLoop<R, E, A, B, C> implements Push<R, E, C> {
  constructor(
    readonly push: Push<R, E, B>,
    readonly seed: A,
    readonly f: (a: A, b: B) => Maybe.Maybe<readonly [A, C]>,
  ) {}

  run<R2>(emitter: Emitter<R2, E, C>): Effect.Effect<R | R2 | Scope, never, unknown> {
    return Effect.suspendSucceed(() => {
      let acc = this.seed

      return this.push.run(
        Emitter(
          (b: B) =>
            pipe(
              this.f(acc, b),
              Maybe.fold(
                () => Effect.unit,
                ([a, c]) => ((acc = a), emitter.emit(c)),
              ),
            ),
          emitter.failCause,
          emitter.end,
        ),
      )
    })
  }

  static make<R, E, A, B, C>(
    push: Push<R, E, B>,
    seed: A,
    f: (a: A, b: B) => Maybe.Maybe<readonly [A, C]>,
  ): Push<R, E, C> {
    if (push instanceof FilterMap) {
      return FilterLoop.make(push.push, seed, (a, x) =>
        pipe(
          x,
          push.f,
          Maybe.flatMap((b) => f(a, b)),
        ),
      )
    }

    if (push instanceof Map) {
      return FilterLoop.make(push.push, seed, (a, x) => f(a, push.f(x)))
    }

    return new FilterLoop(push, seed, f)
  }
}
