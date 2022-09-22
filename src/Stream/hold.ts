import { pipe } from 'hkt-ts'
import { Just, Maybe, Nothing, isJust, toArray } from 'hkt-ts/Maybe'

import { Stream } from './Stream.js'
import { MulticastStream } from './multicast.js'

import { Cause } from '@/Cause/index.js'
import { Fiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { getServiceFromFiberRefs } from '@/FiberRef/builtins.js'
import * as Fx from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

export function hold<R, E, A>(stream: Stream<R, E, A>) {
  return new HoldStream(stream)
}

export class HoldStream<R, E, A> extends MulticastStream<R, E, A> implements Stream<R, E, A> {
  protected value: Maybe<A> = Nothing
  protected pendingSinks: Array<readonly [Sink<E, A, never>, FiberContext<FiberId.Live>, A[]]> = []
  protected scheduledFiber: Fiber<any, any> | undefined

  constructor(readonly stream: Stream<R, E, A>) {
    super(stream)
  }

  fork<E2>(sink: Sink<E, A, E2>, scheduler: Scheduler, context: FiberContext<FiberId.Live>) {
    if (this.shouldScheduleFlush()) {
      return pipe(
        this.scheduleFlush(sink, scheduler, context),
        Fx.flatMap(() => super.fork(sink, scheduler, context)),
      )
    }

    return super.fork(sink, scheduler, context)
  }

  event = (value: A) => {
    this.addValue(value)

    return pipe(
      this.flushPending(),
      Fx.flatMap(() => super.event(value)),
    )
  }

  error = (cause: Cause<E>) => {
    return pipe(
      this.flushPending(),
      Fx.flatMap(() => super.error(cause)),
    )
  }

  get end() {
    return pipe(
      this.flushPending(),
      Fx.flatMap(() => super.end),
    )
  }

  shouldScheduleFlush() {
    return isJust(this.value) && this.observers.length > 0
  }

  flushPending(): Fx.Of<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    if (this.pendingSinks.length > 0) {
      return Fx.zipAll(
        this.pendingSinks.map((observer) =>
          observer[2].length > 0
            ? pipe(
                Fx.Fx(function* () {
                  that.pendingSinks.splice(that.pendingSinks.indexOf(observer), 1)

                  for (const a of observer[2]) {
                    yield* Fx.forkJoinInContext(observer[1].fork())(observer[0].event(a))
                  }
                }),
              )
            : Fx.unit,
        ),
      )
    }

    return Fx.unit
  }

  scheduleFlush<E2>(
    sink: Sink<E, A, E2>,
    scheduler: Scheduler,
    context: FiberContext<FiberId.Live>,
  ): Fx.Of<unknown> {
    this.pendingSinks.push([sink as any, context, [...toArray(this.value)]])

    const fx = this.scheduledFiber ? this.scheduledFiber.interruptAs(FiberId.None) : Fx.unit

    this.scheduledFiber = scheduler.asap(
      this.flushPending(),
      { get: getServiceFromFiberRefs(context.fiberRefs.fork()) },
      context.fork(),
    )

    return fx
  }

  protected addValue(value: A) {
    this.value = Just(value)

    this.pendingSinks.forEach(([, , values]) => {
      values.push(value)
    })
  }
}
