import { constant, flow, pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'

import { Cause } from '@/Cause/Cause.js'
import { Fx, IO, getEnv, getFiberScope, provide, unit } from '@/Fx/Fx.js'

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

export class Drain<E, A> implements Sink<E, A> {
  event: (a: A) => IO<E, unknown> = lazyUnit

  error = (cause: Cause<E>) =>
    Fx(function* () {
      const scope = yield* getFiberScope
      yield* scope.close(Left(cause))
    })

  end = Fx(function* () {
    const scope = yield* getFiberScope
    yield* scope.close(Right(undefined))
  })
}

export type MakeSinkParams<R, E, A> = {
  readonly event?: (a: A) => Fx<R, E, any>
  readonly error?: (e: Cause<E>) => Fx<R, E, any>
  readonly end?: Fx<R, E, any>
}

export function makeSink<R, E, A>({ event, error, end }: MakeSinkParams<R, E, A>) {
  return Fx(function* () {
    const env = yield* getEnv<R>()
    const drain = new Drain<E, A>()
    const sink: Sink<E, A> = {
      event: flow(event ?? drain.event, provide(env)),
      error: flow(error ?? drain.error, provide(env)),
      end: pipe(end ?? drain.end, provide(env)),
    }

    return sink
  })
}
