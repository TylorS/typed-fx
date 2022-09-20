import { flow, pipe } from 'hkt-ts'
import { isRight } from 'hkt-ts/Either'
import { isJust } from 'hkt-ts/Maybe'

import { Stream } from './Stream.js'
import { MapStream } from './map.js'

import { AtomicCounter, decrement, increment } from '@/Atomic/AtomicCounter.js'
import { Cause } from '@/Cause/index.js'
import { Env } from '@/Env/Env.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { Live } from '@/FiberId/FiberId.js'
import * as FiberRefs from '@/FiberRefs/index.js'
import * as Fx from '@/Fx/index.js'
import { access, lazy, provideService, unit } from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import * as Sink from '@/Sink/Sink.js'
import { None, and } from '@/Supervisor/Supervisor.js'

export function flatMap<A, R2, E2, B>(
  f: (a: A) => Stream<R2, E2, B>,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R | R2, E | E2, B> {
  return (stream) => FlatMapStream.make(stream, f, __trace)
}

export function join<R, E, R2, E2, A>(
  stream: Stream<R, E, Stream<R2, E2, A>>,
  __trace?: string,
): Stream<R | R2, E | E2, A> {
  return flatMap((a: Stream<R2, E2, A>) => a, __trace)(stream)
}

export class FlatMapStream<R, E, A, R2, E2, B> implements Stream<R | R2, E | E2, B> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly f: (a: A) => Stream<R2, E2, B>,
    readonly __trace?: string,
  ) {}

  fork<E3>(sink: Sink.Sink<E | E2, B, E3>, scheduler: Scheduler, context: FiberContext<Live>) {
    const { stream, f } = this

    return access((env: Env<R | R2>) =>
      pipe(
        stream.fork(
          new FlatMapSink(sink, scheduler, context, f, env, this.__trace),
          scheduler,
          context,
        ),
        provideService(Scheduler, scheduler),
      ),
    )
  }

  static make<R, E, A, R2, E2, B>(
    stream: Stream<R, E, A>,
    f: (a: A) => Stream<R2, E2, B>,
    __trace?: string,
  ): Stream<R | R2, E | E2, B> {
    if (stream instanceof MapStream) {
      return FlatMapStream.make(stream.stream, flow(stream.f, f), __trace)
    }

    return new FlatMapStream(stream, f, __trace)
  }
}

class FlatMapSink<R, E, A, R2, E2, B, E3> implements Sink.Sink<E | E2, A, E3> {
  protected _running = AtomicCounter()
  protected _ended = false
  protected supervisor = None.extend({
    onEnd: () => (fiber, exit) => {
      const parentContext = fiber.context.parent

      // Merge FiberRefs upon successful completion
      if (isRight(exit) && isJust(parentContext)) {
        FiberRefs.join(parentContext.value.fiberRefs, fiber.context.fiberRefs)
      }
    },
  })

  constructor(
    readonly sink: Sink.Sink<E | E2, B, E3>,
    readonly scheduler: Scheduler,
    readonly context: FiberContext<Live>,
    readonly f: (a: A) => Stream<R2, E2, B>,
    readonly env: Env<R | R2>,
    readonly __trace?: string,
  ) {}

  event = (a: A) =>
    Fx.lazy(() => {
      const forked = this.context.fork({
        supervisor: and(this.supervisor)(this.context.supervisor),
      })

      increment(this._running)

      return pipe(
        this.f(a).fork(Sink.addTrace(this.innerSink(), this.__trace), this.scheduler, forked),
        Fx.provide(this.env),
      )
    })

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
        return this.sink.end
      }

      return unit
    })
  }

  protected innerSink(): Sink.Sink<E | E2, B, E3> {
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
