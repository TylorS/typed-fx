import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { AtomicCounter, decrement, increment } from '@/Atomic/AtomicCounter.js'
import { Cause } from '@/Cause/Cause.js'
import * as Fx from '@/Fx/index.js'
import { SchedulerContext, forkSchedulerContext } from '@/Scheduler/Scheduler.js'
import { Sink, makeSink } from '@/Sink/Sink.js'

export function flatMap<A, R2, E2, B>(f: (a: A) => Stream<R2, E2, B>) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, B> => new FlatMap(stream, f)
}

export function flatten<R, E, R2, E2, A>(
  stream: Stream<R, E, Stream<R2, E2, A>>,
): Stream<R | R2, E | E2, A> {
  return pipe(
    stream,
    flatMap((x) => x),
  )
}

export class FlatMap<R, E, A, R2, E2, B> extends Stream<R | R2, E | E2, B> {
  constructor(readonly stream: Stream<R, E, A>, readonly f: (a: A) => Stream<R2, E2, B>) {
    super((sink, context) => stream.fork(new FlatMapSink(sink, context, f), context))
  }
}

export class FlatMapSink<R, E, A, R2, E2, B> implements Sink<E | E2, A> {
  protected ended = false
  protected running = AtomicCounter()

  constructor(
    readonly sink: Sink<E | E2, B>,
    readonly context: SchedulerContext<R | R2>,
    readonly f: (a: A) => Stream<R2, E2, B>,
  ) {}

  readonly event: (a: A) => Fx.IO<E | E2, unknown> = (a) => {
    const { sink, context, f, releaseIfCompleted } = this

    return pipe(
      Fx.fromLazy(() => increment(this.running)),
      Fx.flatMap(() =>
        Fx.Fx(function* () {
          return f(a).fork(
            yield* makeSink<never, E | E2, B>(sink.event, sink.error, releaseIfCompleted),
            yield* forkSchedulerContext<R2>(),
          )
        }),
      ),
      Fx.provide(context.env),
    )
  }

  readonly error = (cause: Cause<E | E2>) =>
    Fx.lazy(() => {
      this.ended = true

      return this.sink.error(cause)
    })

  readonly end = Fx.lazy(() => {
    this.ended = true

    return this.releaseIfCompleted
  })

  readonly releaseIfCompleted = Fx.lazy(() => {
    const { sink, ended } = this
    const remaining = decrement(this.running)

    return Fx.Fx(function* () {
      if (ended && remaining <= 0) {
        yield* sink.end
      }
    })
  })
}
