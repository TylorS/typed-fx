import { Stream } from './Stream.js'

import { FiberContext } from '@/FiberContext/FiberContext.js'
import { Live } from '@/FiberId/FiberId.js'
import { lazy } from '@/Fx/index.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

export function scan<A, B>(f: (b: B, a: A) => B, b: B, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>) => ScanStream.make(stream, f, b, __trace)
}

export class ScanStream<R, E, A, B> implements Stream<R, E, B> {
  protected state: B

  constructor(
    readonly stream: Stream<R, E, A>,
    readonly f: (b: B, a: A) => B,
    readonly b: B,
    readonly __trace?: string,
  ) {
    this.state = b
  }

  readonly fork = <E2>(sink: Sink<E, B, E2>, context: FiberContext<Live>) =>
    this.stream.fork(
      addTrace(
        {
          ...sink,
          event: (a) => lazy(() => sink.event((this.state = this.f(this.state, a)))),
        },
        this.__trace,
      ),
      context,
    )

  static make<R, E, A, B>(
    stream: Stream<R, E, A>,
    f: (b: B, a: A) => B,
    b: B,
    __trace?: string,
  ): Stream<R, E, B> {
    return new ScanStream(stream, f, b, __trace)
  }
}
