import { constant, flow, pipe } from 'hkt-ts'
import { Right } from 'hkt-ts/Either'

import { Fx, IO, getEnv, getFiberScope, provide, unit } from '../Fx/Fx.js'

export abstract class Sink<out E, in A> {
  abstract readonly event: (a: A) => IO<E, unknown>
  abstract readonly end: IO<E, unknown>
}

const InternalSink = Sink

const lazyUnit = constant(unit)

export type SinkEffects<E, A> = {
  readonly event?: (a: A) => IO<E, unknown>
  readonly end?: IO<E, unknown>
}

export function make<E, A>(effects: SinkEffects<E, A>) {
  return class Sink extends InternalSink<E, A> {
    readonly event = effects.event ?? lazyUnit
    readonly end = effects.end ?? unit
  }
}

export const Drain = new (class Drain extends make({
  end: Fx(function* () {
    const scope = yield* getFiberScope
    yield* scope.close(Right(undefined))
  }),
}) {})()

export type Drain = typeof Drain

export function makeSink<A, R, E, R2 = never, E2 = never>(
  event: (a: A) => Fx<R, E, any>,
  end: Fx<R2, E2, any> = Drain.end,
) {
  return Fx(function* () {
    const env = yield* getEnv<R | R2>()
    const sink: Sink<E | E2, A> = {
      event: flow(event, provide(env)),
      end: pipe(end, provide(env)),
    }

    return sink
  })
}
