import * as Effect from '@effect/core/io/Effect'
import { flow, identity, pipe } from '@fp-ts/data/Function'
import { Predicate } from '@fp-ts/data/Predicate'
import { Refinement } from '@fp-ts/data/Refinement'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Fx } from './Fx.js'
import * as Sink from './Sink.js'
import { FromEffectFx } from './fromEffect.js'

export function map<A, B>(f: (a: A) => B) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, B, E1> => MapFx.make(fx, f)
}

export function as<B>(b: B) {
  return <R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, B, E1> => map(() => b)(fx)
}

export function asUnit<R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, void, E1> {
  return as<void>(undefined)(fx)
}

export class MapFx<R, E, A, B, E1> implements Fx<R, E, B, E1> {
  constructor(readonly fx: Fx<R, E, A, E1>, readonly f: (a: A) => B) {}

  run<R2, E2, C>(sink: Sink.Sink<E, B, R2, E2, C>): Effect.Effect<R | R2, E1 | E2, C> {
    return this.fx.run(Sink.mapInputEvent(this.f)(sink))
  }

  static make = <R, E, A, B, E1>(fx: Fx<R, E, A, E1>, f: (a: A) => B): Fx<R, E, B, E1> => {
    if (fx instanceof MapFx) {
      return new MapFx(fx.fx, flow(fx.f, f))
    }

    if (fx instanceof FromEffectFx) {
      return new FromEffectFx(pipe(fx.effect, Effect.map(f)))
    }

    if (fx instanceof FilterMapFx) {
      return FilterMapFx.make(fx.fx, flow(fx.f, Maybe.map(f)))
    }

    return new MapFx(fx, f)
  }
}

export function filterMap<A, B>(f: (a: A) => Maybe.Maybe<B>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, B, E1> => FilterMapFx.make(fx, f)
}

export function filter<A, B extends A>(
  predicate: Refinement<A, B>,
): <R, E, E1>(fx: Fx<R, E, A, E1>) => Fx<R, E, B, E1>
export function filter<A>(
  predicate: Predicate<A>,
): <R, E, E1>(fx: Fx<R, E, A, E1>) => Fx<R, E, A, E1>

export function filter<A>(predicate: Predicate<A>) {
  return filterMap((a: A) => Maybe.fromPredicate(a, predicate))
}

export function compact<R, E, A, E1>(fx: Fx<R, E, Maybe.Maybe<A>, E1>): Fx<R, E, A, E1> {
  return pipe(fx, filterMap(identity))
}

export class FilterMapFx<R, E, A, E1, B> implements Fx<R, E, B, E1> {
  constructor(readonly fx: Fx<R, E, A, E1>, readonly f: (a: A) => Maybe.Maybe<B>) {}

  run<R2, E2, C>(sink: Sink.Sink<E, B, R2, E2, C>): Effect.Effect<R | R2, E1 | E2, C> {
    return this.fx.run(pipe(sink, Sink.filterMap(this.f)))
  }

  static make = <R, E, A, E1, B>(
    fx: Fx<R, E, A, E1>,
    f: (a: A) => Maybe.Maybe<B>,
  ): Fx<R, E, B, E1> => {
    if (fx instanceof FilterMapFx) {
      return new FilterMapFx(fx.fx, flow(fx.f, Maybe.flatMap(f)))
    }

    return new FilterMapFx(fx, f)
  }
}
