import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'
import { now } from './fromFx.js'

import { Env } from '@/Env/Env.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

export function continueWith<R2, E2, B>(f: () => Stream<R2, E2, B>, __trace?: string) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, A | B> =>
    new ContinueWith(stream, f, __trace)
}

export const startWith =
  <B>(value: B, __trace?: string) =>
  <R, E, A>(stream: Stream<R, E, A>) =>
    pipe(
      now(value),
      continueWith(() => stream, __trace),
    )

export class ContinueWith<R, E, A, R2, E2, B> implements Stream<R | R2, E | E2, A | B> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly f: () => Stream<R2, E2, B>,
    readonly __trace?: string,
  ) {}

  fork = <E3>(
    sink: Sink<E | E2, A | B, E3>,
    scheduler: Scheduler,
    context: FiberContext<FiberId.Live>,
  ) => {
    return Fx.access((env: Env<R | R2>) =>
      this.stream.fork(
        addTrace(new ContinueWithSink(sink, scheduler, context, env, this.f), this.__trace),
        scheduler,
        context,
      ),
    )
  }
}

export class ContinueWithSink<R, E, A, R2, E2, B, E3> implements Sink<E | E2, A | B, E3> {
  constructor(
    readonly sink: Sink<E | E2, A | B, E3>,
    readonly scheduler: Scheduler,
    readonly context: FiberContext<FiberId.Live>,
    readonly env: Env<R | R2>,
    readonly f: () => Stream<R2, E2, B>,
  ) {}

  event = this.sink.event
  error = this.sink.error
  end = Fx.lazy(() =>
    pipe(
      this.f().fork(
        this.sink,
        this.scheduler,
        this.context.fork({ fiberRefs: this.context.fiberRefs }),
      ),
      Fx.provide(this.env),
    ),
  )
}
