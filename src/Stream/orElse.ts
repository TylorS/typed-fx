import { pipe } from 'hkt-ts'
import { isRight } from 'hkt-ts/Either'
import { isJust } from 'hkt-ts/Maybe'

import { Stream } from './Stream.js'

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

  fork<E3>(sink: Sink.Sink<E2, A | B, E3>, scheduler: Scheduler, context: FiberContext<Live>) {
    const { stream, f } = this

    return access((env: Env<R | R2>) =>
      pipe(
        stream.fork(
          new OrElseSink(sink, scheduler, context, f, env, this.__trace),
          scheduler,
          context,
        ),
        provideService(Scheduler, scheduler),
      ),
    )
  }

  static make<R, E, A, R2, E2, B>(
    stream: Stream<R, E, A>,
    f: (cause: Cause<E>) => Stream<R2, E2, B>,
    __trace?: string,
  ): Stream<R | R2, E2, A | B> {
    return new OrElseStream(stream, f, __trace)
  }
}

class OrElseSink<R, E, A, R2, E2, B, E3> implements Sink.Sink<E, A, E3> {
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
    readonly sink: Sink.Sink<E2, A | B, E3>,
    readonly scheduler: Scheduler,
    readonly context: FiberContext<Live>,
    readonly f: (cause: Cause<E>) => Stream<R2, E2, B>,
    readonly env: Env<R | R2>,
    readonly __trace?: string,
  ) {}

  event = this.sink.event

  error = (cause: Cause<E>) => {
    return lazy(() => {
      const forked = this.context.fork({
        supervisor: and(this.supervisor)(this.context.supervisor),
      })

      increment(this._running)

      return pipe(
        this.f(cause).fork(Sink.addTrace(this.innerSink(), this.__trace), this.scheduler, forked),
        Fx.provide(this.env),
      )
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

  protected innerSink(): Sink.Sink<E2, B, E3> {
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
