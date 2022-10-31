import * as Effect from '@effect/core/io/Effect'
import { Scope } from '@effect/core/io/Scope'
import { pipe } from '@tsplus/stdlib/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Fx } from './Fx.js'
import { startWith } from './continueWith.js'
import { FilterMap, Map } from './filterMap.js'

export function loop<A, B, C>(seed: A, f: (a: A, b: B) => readonly [A, C]) {
  return <R, E>(fx: Fx<R, E, B>): Fx<R, E, C> => Loop.make(fx, seed, f)
}

export function scan<A, B>(seed: A, f: (a: A, b: B) => A) {
  return <R, E>(fx: Fx<R, E, B>): Fx<R, E, A> =>
    pipe(
      fx,
      loop(seed, (a, b) => {
        const c = f(a, b)
        return [c, c]
      }),
      startWith(seed),
    )
}

export function filterLoop<A, B, C>(seed: A, f: (a: A, b: B) => Maybe.Maybe<readonly [A, C]>) {
  return <R, E>(fx: Fx<R, E, B>): Fx<R, E, C> => FilterLoop.make(fx, seed, f)
}

export function filterScan<A, B>(seed: A, f: (a: A, b: B) => Maybe.Maybe<A>) {
  return <R, E>(fx: Fx<R, E, B>): Fx<R, E, A> =>
    pipe(
      fx,
      filterLoop(seed, (a, b) =>
        pipe(
          f(a, b),
          Maybe.map((c) => [c, c]),
        ),
      ),
      startWith(seed),
    )
}

export class Loop<R, E, A, B, C> implements Fx<R, E, C> {
  readonly _R!: () => R
  readonly _E!: () => E
  readonly _A!: () => C

  constructor(
    readonly fx: Fx<R, E, B>,
    readonly seed: A,
    readonly f: (a: A, b: B) => readonly [A, C],
  ) {}

  run<R2>(emitter: Emitter<R2, E, C>): Effect.Effect<R | R2 | Scope, never, unknown> {
    return Effect.suspendSucceed(() => {
      let acc = this.seed

      return this.fx.run(
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
    fx: Fx<R, E, B>,
    seed: A,
    f: (a: A, b: B) => readonly [A, C],
  ): Fx<R, E, C> {
    if (fx instanceof FilterMap) {
      return FilterLoop.make(fx.fx, seed, (a, x) =>
        pipe(
          x,
          fx.f,
          Maybe.map((b) => f(a, b)),
        ),
      )
    }

    if (fx instanceof Map) {
      return Loop.make(fx.fx, seed, (a, x) => f(a, fx.f(x)))
    }

    return new Loop(fx, seed, f)
  }
}

export class FilterLoop<R, E, A, B, C> implements Fx<R, E, C> {
  readonly _R!: () => R
  readonly _E!: () => E
  readonly _A!: () => C

  constructor(
    readonly fx: Fx<R, E, B>,
    readonly seed: A,
    readonly f: (a: A, b: B) => Maybe.Maybe<readonly [A, C]>,
  ) {}

  run<R2>(emitter: Emitter<R2, E, C>): Effect.Effect<R | R2 | Scope, never, unknown> {
    return Effect.suspendSucceed(() => {
      let acc = this.seed

      return this.fx.run(
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
    fx: Fx<R, E, B>,
    seed: A,
    f: (a: A, b: B) => Maybe.Maybe<readonly [A, C]>,
  ): Fx<R, E, C> {
    if (fx instanceof FilterMap) {
      return FilterLoop.make(fx.fx, seed, (a, x) =>
        pipe(
          x,
          fx.f,
          Maybe.flatMap((b) => f(a, b)),
        ),
      )
    }

    if (fx instanceof Map) {
      return FilterLoop.make(fx.fx, seed, (a, x) => f(a, fx.f(x)))
    }

    return new FilterLoop(fx, seed, f)
  }
}
