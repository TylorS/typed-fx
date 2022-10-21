import * as Effect from '@effect/core/io/Effect'
import { flow, identity, pipe } from '@fp-ts/data/Function'
import { Predicate } from '@fp-ts/data/Predicate'
import { Refinement } from '@fp-ts/data/Refinement'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import * as Sink from './Sink.js'
import { Stream } from './Stream.js'
import { FromEffectStream } from './fromEffect.js'

export function map<A, B>(f: (a: A) => B) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, B, E1> => MapStream.make(stream, f)
}

export function as<B>(b: B) {
  return <R, E, A, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, B, E1> => map(() => b)(stream)
}

export function asUnit<R, E, A, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, void, E1> {
  return as<void>(undefined)(stream)
}

export class MapStream<R, E, A, B, E1> implements Stream<R, E, B, E1> {
  constructor(readonly stream: Stream<R, E, A, E1>, readonly f: (a: A) => B) {}

  run<R2, E2, C>(sink: Sink.Sink<E, B, R2, E2, C>): Effect.Effect<R | R2, E1 | E2, C> {
    return this.stream.run(Sink.mapInputEvent(this.f)(sink))
  }

  static make = <R, E, A, B, E1>(
    stream: Stream<R, E, A, E1>,
    f: (a: A) => B,
  ): Stream<R, E, B, E1> => {
    if (stream instanceof MapStream) {
      return new MapStream(stream.stream, flow(stream.f, f))
    }

    if (stream instanceof FromEffectStream) {
      return new FromEffectStream(pipe(stream.effect, Effect.map(f)))
    }

    if (stream instanceof FilterMapStream) {
      return FilterMapStream.make(stream.stream, flow(stream.f, Maybe.map(f)))
    }

    return new MapStream(stream, f)
  }
}

export function filterMap<A, B>(f: (a: A) => Maybe.Maybe<B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, B, E1> =>
    FilterMapStream.make(stream, f)
}

export function filter<A, B extends A>(
  predicate: Refinement<A, B>,
): <R, E, E1>(stream: Stream<R, E, A, E1>) => Stream<R, E, B, E1>
export function filter<A>(
  predicate: Predicate<A>,
): <R, E, E1>(stream: Stream<R, E, A, E1>) => Stream<R, E, A, E1>

export function filter<A>(predicate: Predicate<A>) {
  return filterMap((a: A) => Maybe.fromPredicate(a, predicate))
}

export function compact<R, E, A, E1>(
  stream: Stream<R, E, Maybe.Maybe<A>, E1>,
): Stream<R, E, A, E1> {
  return pipe(stream, filterMap(identity))
}

export class FilterMapStream<R, E, A, E1, B> implements Stream<R, E, B, E1> {
  constructor(readonly stream: Stream<R, E, A, E1>, readonly f: (a: A) => Maybe.Maybe<B>) {}

  run<R2, E2, C>(sink: Sink.Sink<E, B, R2, E2, C>): Effect.Effect<R | R2, E1 | E2, C> {
    return this.stream.run(pipe(sink, Sink.filterMap(this.f)))
  }

  static make = <R, E, A, E1, B>(
    stream: Stream<R, E, A, E1>,
    f: (a: A) => Maybe.Maybe<B>,
  ): Stream<R, E, B, E1> => {
    if (stream instanceof FilterMapStream) {
      return new FilterMapStream(stream.stream, flow(stream.f, Maybe.flatMap(f)))
    }

    return new FilterMapStream(stream, f)
  }
}
