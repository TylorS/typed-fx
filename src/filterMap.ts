import { Effect, Option, Predicate, Scope, flow } from 'effect'

import { Emitter, Fx } from './Fx.js'

export const map =
  <A, B>(f: (a: A) => B) =>
  <R, E>(fx: Fx<R, E, A>): Fx<R, E, B> =>
    Map.make(fx, f)

export const as = <B>(value: B): (<R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, B>) => map(() => value)

export class Map<R, E, A, B> implements Fx<R, E, B> {
  readonly _R!: () => R
  readonly _E!: () => E
  readonly _A!: () => B

  constructor(readonly fx: Fx<R, E, A>, readonly f: (a: A) => B) {}

  run<R2>(emitter: Emitter<R2, E, B>): Effect.Effect<R | R2 | Scope.Scope, never, unknown> {
    return this.fx.run(Emitter(flow(this.f, emitter.emit), emitter.failCause, emitter.end))
  }

  static make = <R, E, A, B>(fx: Fx<R, E, A>, f: (a: A) => B): Fx<R, E, B> => {
    if (fx instanceof Map) {
      return Map.make(fx.fx, flow(fx.f, f))
    }

    if (fx instanceof FilterMap) {
      return FilterMap.make(fx.fx, flow(fx.f, Option.map(f)))
    }

    return new Map(fx, f)
  }
}

export function filterMap<A, B>(f: (a: A) => Option.Option<B>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R, E, B> => FilterMap.make(fx, f)
}

export function filter<A>(predicate: Predicate.Predicate<A>) {
  return filterMap((a: A) => (predicate(a) ? Option.some(a) : Option.none))
}

export class FilterMap<R, E, A, B> implements Fx<R, E, B> {
  readonly _R!: () => R
  readonly _E!: () => E
  readonly _A!: () => B

  constructor(readonly fx: Fx<R, E, A>, readonly f: (a: A) => Option.Option<B>) {}

  run<R2>(emitter: Emitter<R2, E, B>): Effect.Effect<R | R2 | Scope.Scope, never, unknown> {
    return this.fx.run(
      Emitter(
        flow(this.f, Option.match(Effect.unit, emitter.emit)),
        emitter.failCause,
        emitter.end,
      ),
    )
  }

  static make<R, E, A, B>(fx: Fx<R, E, A>, f: (a: A) => Option.Option<B>): Fx<R, E, B> {
    if (fx instanceof Map) {
      return FilterMap.make(fx.fx, flow(fx.f, f))
    }

    if (fx instanceof FilterMap) {
      return FilterMap.make(fx.fx, flow(fx.f, Option.flatMap(f)))
    }

    return new FilterMap(fx, f)
  }
}
