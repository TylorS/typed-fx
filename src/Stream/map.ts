import { flow } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { FiberContext } from '@/FiberContext/FiberContext.js'
import { Live } from '@/FiberId/FiberId.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

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

    return new MapStream(stream, f, __trace)
  }
}
