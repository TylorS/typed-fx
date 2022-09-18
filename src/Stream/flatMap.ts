import { flow, pipe } from 'hkt-ts'

import { Stream } from './Stream.js'
import { MapStream } from './map.js'

import { AtomicCounter, decrement } from '@/Atomic/AtomicCounter.js'
import { Cause } from '@/Cause/index.js'
import { Env } from '@/Env/Env.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { Live } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/index.js'
import { lazy, span, unit } from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

export function flatMap<A, R2, E2, B>(
  f: (a: A) => Stream<R2, E2, B>,
): <R, E>(stream: Stream<R, E, A>) => Stream<R | R2, E | E2, B> {
  return (stream) => FlatMapStream.make(stream, f)
}

export class FlatMapStream<R, E, A, R2, E2, B> implements Stream<R | R2, E | E2, B> {
  constructor(readonly stream: Stream<R, E, A>, readonly f: (a: A) => Stream<R2, E2, B>) {}

  fork<E3>(sink: Sink<E | E2, B, E3>, scheduler: Scheduler, context: FiberContext<Live>) {
    const { stream, f } = this

    return pipe(
      Fx.getEnv<R | R2>(),
      Fx.flatMap((env) =>
        stream.fork(new FlatMapSink(sink, scheduler, context, f, env), scheduler, context),
      ),
      span('Stream.flatMap'),
    )
  }

  static make<R, E, A, R2, E2, B>(
    stream: Stream<R, E, A>,
    f: (a: A) => Stream<R2, E2, B>,
  ): Stream<R | R2, E | E2, B> {
    if (stream instanceof MapStream) {
      return FlatMapStream.make(stream.stream, flow(stream.f, f))
    }

    return new FlatMapStream(stream, f)
  }
}

class FlatMapSink<R, E, A, R2, E2, B, E3> implements Sink<E | E2, A, E3> {
  protected _running = AtomicCounter()
  protected _ended = false

  constructor(
    readonly sink: Sink<E | E2, B, E3>,
    readonly scheduler: Scheduler,
    readonly context: FiberContext<Live>,
    readonly f: (a: A) => Stream<R2, E2, B>,
    readonly env: Env<R | R2>,
  ) {}

  event = (a: A) => {
    return pipe(
      this.f(a).fork(this.innerSink(), this.scheduler, this.context.fork()),
      Fx.provide(this.env),
    )
  }

  error = (cause: Cause<E | E2>) => {
    return lazy(() => {
      this._ended = true

      return this.sink.error(cause)
    })
  }

  end = lazy(() => {
    this._ended = true

    return this.endIfCompleted()
  })

  protected endIfCompleted() {
    return lazy(() => {
      if (this._ended && this._running.get() === 0) {
        this.sink.end
      }

      return unit
    })
  }

  protected innerSink(): Sink<E | E2, B, E3> {
    return {
      event: this.sink.event,
      error: this.error,
      end: lazy(() => {
        decrement(this._running)
        return this.endIfCompleted()
      }),
    }
  }
}
