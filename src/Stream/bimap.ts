import { flow } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { MapStream } from './map.js'

import * as Cause from '@/Cause/index.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { Live } from '@/FiberId/FiberId.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

export function bimap<A, B, C, D>(
  f: (a: A) => B,
  g: (c: C) => D,
): <R>(stream: Stream<R, A, C>) => Stream<R, B, D> {
  return (stream) => BimapStream.make(stream, f, g)
}

export class BimapStream<R, A, B, C, D> implements Stream<R, B, D> {
  constructor(readonly stream: Stream<R, A, C>, readonly f: (a: A) => B, readonly g: (c: C) => D) {}

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
  ): Stream<R, B, D> {
    if (stream instanceof MapStream) {
      return BimapStream.make(stream.stream, f, flow(stream.f, g))
    }

    if (stream instanceof BimapStream) {
      return BimapStream.make(stream.stream, flow(stream.f, f), flow(stream.g, g))
    }

    return new BimapStream(stream, f, g)
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
