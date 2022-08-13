import { constant, flow, pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'

import { Cause } from '@/Cause/Cause.js'
import { Fx, IO, getEnv, getFiberScope, provide, uninterruptable, unit } from '@/Fx/Fx.js'

export abstract class Sink<E, A> {
  readonly event: (a: A) => IO<E, unknown> = lazyUnit as any
  readonly error: (cause: Cause<E>) => IO<E, unknown> = lazyUnit as any
  readonly end: IO<E, unknown> = lazyUnit as any
}

const InternalSink = Sink

const lazyUnit = constant(unit)

export type SinkEffects<E, A> = {
  readonly event?: (a: A) => IO<E, unknown>
  readonly error?: (cause: Cause<E>) => IO<E, unknown>
  readonly end?: IO<E, unknown>
}

export function make<E, A>(effects: SinkEffects<E, A>) {
  return class Sink extends InternalSink<E, A> {
    readonly event = effects.event ?? super.event
    readonly error = effects.error ?? super.error
    readonly end = effects.end ?? super.end
  }
}

export const Drain = new (class Drain extends make<never, any>({
  error: (cause: Cause<never>) =>
    Fx(function* () {
      const scope = yield* getFiberScope
      yield* scope.close(Left(cause))
    }),
  end: Fx(function* () {
    const scope = yield* getFiberScope
    yield* scope.close(Right(undefined))
  }),
}) {})() as any as Sink<any, any>

export type Drain = typeof Drain

export function makeSink<R, E, A>(
  event: (a: A) => Fx<R, E, any>,
  error: (e: Cause<E>) => Fx<R, E, any> = Drain.error as any,
  end: Fx<R, E, any> = Drain.end as any,
) {
  return Fx(function* () {
    const env = yield* getEnv<R>()
    const sink: Sink<E, A> = {
      event: flow(event, uninterruptable, provide(env)),
      error: flow(error, uninterruptable, provide(env)),
      end: pipe(end, uninterruptable, provide(env)),
    }

    return sink
  })
}
