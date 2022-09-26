import { Stream } from './Stream.js'

import { AtomicCounter, decrement, increment } from '@/Atomic/AtomicCounter.js'
import { Cause } from '@/Cause/index.js'
import { lazy, unit } from '@/Fx/index.js'
import * as Sink from '@/Sink/Sink.js'

export function orElse<E, R2, E2, B>(
  f: (cause: Cause<E>) => Stream<R2, E2, B>,
  __trace?: string,
): <R, A>(stream: Stream<R, E, A>) => Stream<R | R2, E2, A | B> {
  return (stream) => OrElseStream.make(stream, f, __trace)
}

export class OrElseStream<R, E, A, R2, E2, B> implements Stream<R | R2, E2, A | B> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly f: (cause: Cause<E>) => Stream<R2, E2, B>,
    readonly __trace?: string,
  ) {}

  fork<E3>(sink: Sink.Sink<E2, A | B, E3>) {
    const { stream, f } = this

    return stream.fork(new OrElseSink(sink, f, this.__trace))
  }

  static make<R, E, A, R2, E2, B>(
    stream: Stream<R, E, A>,
    f: (cause: Cause<E>) => Stream<R2, E2, B>,
    __trace?: string,
  ): Stream<R | R2, E2, A | B> {
    return new OrElseStream(stream, f, __trace)
  }
}

class OrElseSink<E, A, R2, E2, B, R3, E3> implements Sink.Sink<E, A, R2 | R3, E3> {
  protected _running = AtomicCounter()
  protected _ended = false

  constructor(
    readonly sink: Sink.Sink<E2, A | B, R3, E3>,
    readonly f: (cause: Cause<E>) => Stream<R2, E2, B>,
    readonly __trace?: string,
  ) {}

  event = this.sink.event

  error = (cause: Cause<E>) => {
    return lazy(() => {
      increment(this._running)

      return this.f(cause).fork(Sink.addTrace(this.innerSink(), this.__trace))
    })
  }

  end = lazy(() => {
    this._ended = true

    return this.endIfCompleted()
  })

  protected endIfCompleted() {
    return lazy(() => {
      if (this._ended && this._running.get() === 0) {
        return this.sink.end
      }

      return unit
    })
  }

  protected innerSink(): Sink.Sink<E2, B, R3, E3> {
    return {
      event: this.sink.event,
      error: this.sink.error,
      end: lazy(() => {
        decrement(this._running)
        return this.endIfCompleted()
      }),
    }
  }
}
