import { Maybe } from 'hkt-ts'
import { flow, pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import * as Cause from '@/Cause/index.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { Live } from '@/FiberId/FiberId.js'
import { unit } from '@/Fx/Fx.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

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

  fork = <E>(sink: Sink<B, D, E>, scheduler: Scheduler, context: FiberContext<Live>) => {
    return this.stream.fork<E>(
      new BimapSink(sink, scheduler, context, this.f, this.g),
      scheduler,
      context,
    )
  }

  static make<R, A, B, C, D>(
    stream: Stream<R, A, C>,
    f: (a: A) => B,
    g: (c: C) => D,
    __trace?: string,
  ): Stream<R, B, D> {
    if (stream instanceof MapStream) {
      return BimapStream.make(stream.stream, f, flow(stream.f, g), __trace)
    }

    if (stream instanceof BimapStream) {
      return BimapStream.make(stream.stream, flow(stream.f, f), flow(stream.g, g), __trace)
    }

    return new BimapStream(stream, f, g, __trace)
  }
}

class BimapSink<A, B, C, D, E> implements Sink<A, C, E> {
  constructor(
    readonly sink: Sink<B, D, E>,
    readonly scheduler: Scheduler,
    readonly context: FiberContext<Live>,
    readonly f: (a: A) => B,
    readonly g: (c: C) => D,
  ) {}

  event = flow(this.g, this.sink.event)
  error = flow(Cause.map(this.f), this.sink.error)
  end = this.sink.end
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

  fork<E2>(sink: Sink<E, B, E2>, scheduler: Scheduler, context: FiberContext<Live>) {
    return this.stream.fork(
      addTrace(
        {
          ...sink,
          event: flow(this.f, sink.event),
        },
        this.__trace,
      ),
      scheduler,
      context,
    )
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

  fork<E3>(sink: Sink<E2, A, E3>, scheduler: Scheduler, context: FiberContext<Live>) {
    return this.stream.fork(
      addTrace(
        {
          ...sink,
          error: flow(Cause.map(this.f), sink.error),
        },
        this.__trace,
      ),
      scheduler,
      context,
    )
  }

  static make<R, E1, A, E2>(
    stream: Stream<R, E1, A>,
    f: (e: E1) => E2,
    __trace?: string,
  ): Stream<R, E2, A> {
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

  fork<E2>(sink: Sink<E, B, E2>, scheduler: Scheduler, context: FiberContext<Live>) {
    return this.stream.fork(
      addTrace(
        {
          ...sink,
          event: (a) =>
            pipe(
              a,
              this.f,
              Maybe.match(() => unit, sink.event),
            ),
        },
        this.__trace,
      ),
      scheduler,
      context,
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
