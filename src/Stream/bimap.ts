import { Maybe } from 'hkt-ts'
import { flow, pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { FromFxStream } from './fromFx.js'

import * as Cause from '@/Cause/index.js'
import * as Fx from '@/Fx/Fx.js'
import * as Sink from '@/Sink/index.js'

export function bimap<A, B, C, D>(
  f: (a: A) => B,
  g: (c: C) => D,
  __trace?: string,
): <R>(stream: Stream<R, A, C>) => Stream<R, B, D> {
  return (stream) => BimapStream.make(stream, f, g, __trace)
}

export class BimapStream<R, A, B, C, D> implements Stream<R, B, D> {
  constructor(
    readonly stream: Stream<R, A, C>,
    readonly f: (a: A) => B,
    readonly g: (c: C) => D,
    readonly __trace?: string,
  ) {}

  fork = <R2, E>(sink: Sink.Sink<B, D, R2, E>) =>
    this.stream.fork<R2, E>(pipe(sink, Sink.localBoth(Cause.map(this.f), this.g, this.__trace)))

  static make<R, A, B, C, D>(
    stream: Stream<R, A, C>,
    f: (a: A) => B,
    g: (c: C) => D,
    __trace?: string,
  ): Stream<R, B, D> {
    if (stream instanceof FromFxStream) {
      return new FromFxStream(pipe(stream.fx, Fx.bimap(f, g)), __trace)
    }

    if (stream instanceof MapStream) {
      return BimapStream.make(stream.stream, f, flow(stream.f, g), __trace)
    }

    if (stream instanceof BimapStream) {
      return BimapStream.make(stream.stream, flow(stream.f, f), flow(stream.g, g), __trace)
    }

    return new BimapStream(stream, f, g, __trace)
  }
}

export function map<A, B>(
  f: (a: A) => B,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (stream) => MapStream.make(stream, f, __trace)
}

export class MapStream<R, E, A, B> implements Stream<R, E, B> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly f: (a: A) => B,
    readonly __trace?: string,
  ) {}

  fork<R2, E2>(sink: Sink.Sink<E, B, R2, E2>) {
    return this.stream.fork(Sink.local(this.f, this.__trace)(sink))
  }

  static make<R, E, A, B>(
    stream: Stream<R, E, A>,
    f: (a: A) => B,
    __trace?: string,
  ): Stream<R, E, B> {
    if (stream instanceof MapStream) {
      return MapStream.make(stream.stream, flow(stream.f, f), __trace)
    }

    if (stream instanceof MapLeftStream) {
      return BimapStream.make(stream.stream, stream.f, f, __trace)
    }

    if (stream instanceof FilterMapStream) {
      return FilterMapStream.make(stream.stream, flow(stream.f, Maybe.map(f)), __trace)
    }

    return new MapStream(stream, f, __trace)
  }
}

export function mapLeft<E1, E2>(
  f: (error: E1) => E2,
  __trace?: string,
): <R, A>(stream: Stream<R, E1, A>) => Stream<R, E2, A> {
  return (stream) => MapLeftStream.make(stream, f, __trace)
}

export class MapLeftStream<R, E1, A, E2> implements Stream<R, E2, A> {
  constructor(
    readonly stream: Stream<R, E1, A>,
    readonly f: (error: E1) => E2,
    readonly __trace?: string,
  ) {}

  fork<R3, E3>(sink: Sink.Sink<E2, A, R3, E3>) {
    return this.stream.fork(pipe(sink, Sink.localError(Cause.map(this.f), this.__trace)))
  }

  static make<R, E1, A, E2>(
    stream: Stream<R, E1, A>,
    f: (e: E1) => E2,
    __trace?: string,
  ): Stream<R, E2, A> {
    if (stream instanceof FromFxStream) {
      return new FromFxStream(pipe(stream.fx, Fx.mapLeft(f)), __trace)
    }
    if (stream instanceof MapLeftStream) {
      return MapLeftStream.make(stream.stream, flow(stream.f, f), __trace)
    }

    if (stream instanceof MapStream) {
      return BimapStream.make(stream.stream, f, stream.f, __trace)
    }

    return new MapLeftStream(stream, f, __trace)
  }
}

export function filterMap<A, B>(
  f: (a: A) => Maybe.Maybe<B>,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (stream) => FilterMapStream.make(stream, f, __trace)
}

export class FilterMapStream<R, E, A, B> implements Stream<R, E, B> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly f: (a: A) => Maybe.Maybe<B>,
    readonly __trace?: string,
  ) {}

  fork<R3, E2>(sink: Sink.Sink<E, B, R3, E2>) {
    return this.stream.fork<R3, E2>(
      pipe(
        sink,
        Sink.onEvent(
          flow(
            this.f,
            Maybe.match(() => Fx.unit, sink.event),
          ),
        ),
      ),
    )
  }

  static make<R, E, A, B>(
    stream: Stream<R, E, A>,
    f: (a: A) => Maybe.Maybe<B>,
    __trace?: string,
  ): Stream<R, E, B> {
    if (stream instanceof MapStream) {
      return FilterMapStream.make(stream.stream, flow(stream.f, f), __trace)
    }

    if (stream instanceof FilterMapStream) {
      return FilterMapStream.make(stream.stream, flow(stream.f, Maybe.flatMap(f)), __trace)
    }

    return new FilterMapStream(stream, f, __trace)
  }
}
