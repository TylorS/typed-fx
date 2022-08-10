import { constant, flow, pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'

import { Fx, IO, getEnv, getFiberScope, provide, unit } from '../Fx/Fx.js'

import { Cause } from '@/Cause/Cause.js'

export abstract class Sink<in out E, in A> {
  abstract readonly event: (a: A) => IO<E, unknown>
  abstract readonly error: (cause: Cause<E>) => IO<E, unknown>
  abstract readonly end: IO<E, unknown>
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
    readonly event = effects.event ?? lazyUnit
    readonly error = effects.error ?? lazyUnit
    readonly end = effects.end ?? unit
  }
}

export const Drain = new (class Drain extends make({
  error: (cause: Cause<any>) =>
    Fx(function* () {
      const scope = yield* getFiberScope
      yield* scope.close(Left(cause))
    }),
  end: Fx(function* () {
    const scope = yield* getFiberScope
    yield* scope.close(Right(undefined))
  }),
}) {})()

export type Drain = typeof Drain

export function makeSink<R, E, A>(
  event: (a: A) => Fx<R, E, any>,
  error: (e: Cause<E>) => Fx<R, E, any> = Drain.error,
  end: Fx<R, E, any> = Drain.end,
) {
  return Fx(function* () {
    const env = yield* getEnv<R>()
    const sink: Sink<E, A> = {
      event: flow(event, provide(env)),
      error: flow(error, provide(env)),
      end: pipe(end, provide(env)),
    }

    return sink
  })
}
