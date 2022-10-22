import { Cause } from '@effect/core/io/Cause'
import { Deferred } from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as FiberId from '@effect/core/io/FiberId'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'
import { Env } from '@tsplus/stdlib/service/Env'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { asap } from './_internal.js'
import { Multicast } from './multicast.js'

export function hold<R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, A, E1> {
  return new Hold(fx)
}

export class Hold<R, E, E1, A> extends Multicast<R, E, A, E1> {
  protected _value: Maybe.Maybe<A> = Maybe.none
  protected _pendingSinks: Array<readonly [Sink<E, A, any, any, any>, A[]]> = []
  protected _scheduledFiber: Fiber.RealFiber<any, any> | undefined

  constructor(readonly fx: Fx<R, E, A, E1>) {
    super(fx)
  }

  run<R2, E2, B>(sink: Sink<E, A, R2, E2, B>): Effect.Effect<R | R2, E1 | E2, B> {
    if (this.shouldScheduleFlush()) {
      return pipe(
        this.scheduleFush(sink),
        Effect.flatMap(() => super.run(sink)),
      )
    }

    return super.run(sink)
  }

  event(value: A) {
    this.addValue(value)

    return pipe(
      this.flushPending(),
      Effect.flatMap(() => super.event(value)),
    )
  }

  error(cause: Cause<E>) {
    return pipe(
      this.flushPending(),
      Effect.flatMap(() => super.error(cause)),
    )
  }

  get end() {
    return pipe(
      this.flushPending(),
      Effect.flatMap(() => super.end),
    )
  }

  protected shouldScheduleFlush() {
    return Maybe.isSome(this._value) && this.sinks.length > 0
  }

  protected scheduleFush(sink: Sink<E, A, any, any, any>) {
    this._pendingSinks.push([
      sink,
      pipe(
        this._value,
        Maybe.fold(
          () => [],
          (a) => [a],
        ),
      ),
    ])

    const interrupt = this._scheduledFiber
      ? this._scheduledFiber.interruptAsFork(new FiberId.None())
      : Effect.unit

    this._scheduledFiber = undefined

    return pipe(
      interrupt,
      Effect.flatMap(() => this.flushPending()),
      Effect.schedule(asap),
      Effect.fork,
      Effect.tap((fiber: Fiber.RealFiber<any, any>) =>
        Effect.sync(() => (this._scheduledFiber = fiber)),
      ),
    )
  }

  protected flushPending() {
    if (this._pendingSinks.length === 0) {
      return Effect.unit
    }

    const pendingSinks = this._pendingSinks
    this._pendingSinks = []

    return Effect.forEachDiscard(pendingSinks, (pending) =>
      Effect.suspendSucceed(() => {
        const [sink, values] = pending
        const observer = this.findSink(sink)

        if (!observer) {
          return Effect.unit
        }

        return Effect.forEachDiscard(values, (value) => this.runEvent(value, observer))
      }),
    )
  }

  protected addValue(value: A) {
    this._value = Maybe.some(value)

    this._pendingSinks.forEach(([, values]) => {
      values.push(value)
    })
  }

  protected findSink(
    sink: Sink<E, A, any, any, any>,
  ): readonly [Sink<E, A, any, any, any>, Env<any>, Deferred<any, any>] | undefined {
    return this.sinks.find(([s]) => s === sink)
  }
}
