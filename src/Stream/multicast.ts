import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/Cause.js'
import { fromScope } from '@/Fiber/fromScope.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/index.js'
import * as Fx from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/index.js'
import { Sink } from '@/Sink/Sink.js'
import { Fiber } from '@/index.js'

export function multicast<R, E, A>(stream: Stream<R, E, A>) {
  return new MulticastStream(stream)
}

type Observer<E, A, E2> = {
  sink: Sink<E, A, E2>
  scheduler: Scheduler
  context: FiberContext<FiberId.Live>
}

// TODO: how to create a synthetic fiber around multicasted streams?

export class MulticastStream<R, E, A> implements Stream<R, E, A>, Sink<E, A, any> {
  protected observers: Array<Observer<E, A, any>> = []
  protected fiber: Fiber.Fiber<any, any> | undefined

  constructor(readonly stream: Stream<R, E, A>) {
    this.event = this.event.bind(this)
    this.error = this.error.bind(this)
  }

  fork<E2>(sink: Sink<E, A, E2>, scheduler: Scheduler, context: FiberContext<FiberId.Live>) {
    return Fx.lazy(() => {
      const observer: Observer<E, A, E2> = {
        sink,
        scheduler,
        context,
      }

      const l = this.observers.length

      this.observers.push(observer)

      if (l === 0) {
        return pipe(
          this.stream.fork(this, scheduler, context),
          Fx.tapLazy((fiber) => (this.fiber = fiber)),
          Fx.map(() => this.createFiber(observer)),
        )
      }

      return Fx.fromLazy(() => this.createFiber(observer))
    })
  }

  event(a: A) {
    return Fx.zipAll(
      this.observers.map(({ sink, context }) =>
        pipe(sink.event(a), Fx.forkJoinInContext(context.fork())),
      ),
    )
  }

  error(cause: Cause<E>) {
    return pipe(
      Fx.zipAll(
        this.observers.map(({ sink, context }) =>
          pipe(sink.error(cause), Fx.forkJoinInContext(context.fork())),
        ),
      ),
      Fx.tap((): Fx.Of<any> => (this.fiber ? this.fiber.interruptAs(FiberId.None) : Fx.unit)),
      Fx.tapLazy(() => (this.observers = [])),
    )
  }

  get end() {
    return pipe(
      Fx.lazy(() =>
        Fx.zipAll(
          this.observers.map(({ sink, context }) =>
            pipe(sink.end, Fx.forkJoinInContext(context.fork())),
          ),
        ),
      ),
      Fx.tapLazy(() => (this.observers = [])),
    )
  }

  protected createFiber = <E2>(observer: Observer<E, A, E2>) => {
    const { context } = observer
    context.scope.ensuring(() =>
      pipe(
        Fx.fromLazy(() => {
          const index = this.observers.indexOf(observer)

          if (index >= 0) {
            this.observers.splice(index, 1)
          }
        }),
        Fx.flatMap(
          (): Fx.Of<any> =>
            this.observers.length === 0 && this.fiber
              ? this.fiber.interruptAs(context.id)
              : Fx.unit,
        ),
      ),
    )

    return fromScope(new FiberId.Synthetic([context.id]), context.fiberRefs, context.scope)
  }
}
