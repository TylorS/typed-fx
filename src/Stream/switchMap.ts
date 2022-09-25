import { flow, pipe } from 'hkt-ts'

import { Stream } from './Stream.js'
import { MapStream } from './bimap.js'

import { Cause } from '@/Cause/index.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import { Env } from '@/Env/Env.js'
import { Fiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { Live } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/index.js'
import { access, lazy, unit } from '@/Fx/index.js'
import { Lock } from '@/Semaphore/Semaphore.js'
import * as Sink from '@/Sink/Sink.js'
import * as Supervisor from '@/Supervisor/index.js'

export function switchMap<A, R2, E2, B>(
  f: (a: A) => Stream<R2, E2, B>,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R | R2, E | E2, B> {
  return (stream) => SwitchMapStream.make(stream, f, __trace)
}

export function switchLatest<R, E, R2, E2, A>(
  stream: Stream<R, E, Stream<R2, E2, A>>,
  __trace?: string,
): Stream<R | R2, E | E2, A> {
  return switchMap((a: Stream<R2, E2, A>) => a, __trace)(stream)
}

export class SwitchMapStream<R, E, A, R2, E2, B> implements Stream<R | R2, E | E2, B> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly f: (a: A) => Stream<R2, E2, B>,
    readonly __trace?: string,
  ) {}

  fork<E3>(sink: Sink.Sink<E | E2, B, E3>, context: FiberContext<Live>) {
    const { stream, f } = this

    return access((env: Env<R | R2>) =>
      stream.fork(new SwitchMapSink(sink, context, f, env, this.__trace), context),
    )
  }

  static make<R, E, A, R2, E2, B>(
    stream: Stream<R, E, A>,
    f: (a: A) => Stream<R2, E2, B>,
    __trace?: string,
  ): Stream<R | R2, E | E2, B> {
    if (stream instanceof MapStream) {
      return SwitchMapStream.make(stream.stream, flow(stream.f, f), __trace)
    }

    return new SwitchMapStream(stream, f, __trace)
  }
}

class SwitchMapSink<R, E, A, R2, E2, B, E3> implements Sink.Sink<E | E2, A, E3> {
  protected _ended = false
  protected _fibers: Array<Fiber<E3, any>> = []
  protected _lock = new Lock()

  constructor(
    readonly sink: Sink.Sink<E | E2, B, E3>,
    readonly context: FiberContext<Live>,
    readonly f: (a: A) => Stream<R2, E2, B>,
    readonly env: Env<R | R2>,
    readonly __trace?: string,
  ) {}

  event = (a: A): Fx.IO<E3, unknown> =>
    Fx.lazy(() => {
      const forked = this.context.fork({
        supervisor: Supervisor.and(Supervisor.inheritFiberRefs)(this.context.supervisor),
      })

      const cleanup: Fx.Of<unknown> = Fx.zipAll(this._fibers.map((f) => f.interruptAs(forked.id)))
      const disposable = settable()
      const sink = this.innerSink(disposable)

      return pipe(
        cleanup, // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Fx.flatMap(() => this.f(a).fork(Sink.addTrace(sink, this.__trace), forked)),
        Fx.tapLazy((fiber) => {
          this._fibers.push(fiber)

          disposable.add(
            Disposable(() => {
              this._fibers.splice(this._fibers.indexOf(fiber), 1)
            }),
          )
        }),
        Fx.flatMap((fiber) =>
          pipe(
            fiber,
            Fx.join,
            Fx.tapLazy(() => disposable.dispose()),
          ),
        ),
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
    if (this._ended && this._fibers.length === 0) {
      return this.sink.end
    }

    return unit
  }

  protected innerSink(disposable: Settable): Sink.Sink<E | E2, B, E3> {
    return {
      event: this.sink.event,
      error: this.error,
      end: lazy(() => {
        disposable.dispose()
        return this.endIfCompleted()
      }),
    }
  }
}
