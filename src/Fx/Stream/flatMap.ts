import { pipe } from 'hkt-ts'

import { Env } from '../Env/Env.js'
import * as Fx from '../Fx/index.js'
import { Scheduler } from '../Scheduler/Scheduler.js'
import { Sink, makeSink } from '../Sink/Sink.js'

import { Stream } from './Stream.js'

import { AtomicCounter, decrement, increment } from '@/Atomic/AtomicCounter.js'
import { Cause } from '@/Cause/Cause.js'

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
    super((sink, scheduler) =>
      Fx.Fx(function* () {
        const env = yield* Fx.getEnv<R | R2>()

        return yield* stream.fork(new FlatMapSink(sink, scheduler, env, f), scheduler)
      }),
    )
  }
}

export class FlatMapSink<R, E, A, R2, E2, B> implements Sink<E | E2, A> {
  protected ended = false
  protected running = AtomicCounter()

  constructor(
    readonly sink: Sink<E | E2, B>,
    readonly scheduler: Scheduler,
    readonly env: Env<R | R2>,
    readonly f: (a: A) => Stream<R2, E2, B>,
  ) {}

  readonly event: (a: A) => Fx.IO<E | E2, unknown> = (a) => {
    const { sink, scheduler, env, f, releaseIfCompleted } = this

    return pipe(
      Fx.fromLazy(() => increment(this.running)),
      Fx.flatMap(() => makeSink<never, E | E2, B>(sink.event, sink.error, releaseIfCompleted)),
      Fx.flatMap((sink) => f(a).fork(sink, scheduler)),
      Fx.provide(env),
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
