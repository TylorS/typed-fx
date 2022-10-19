import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { Layer } from '@effect/core/io/Layer'
import { flow, pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'
import { Env } from '@tsplus/stdlib/service/Env'

export interface Sink<E, A, R2, E2, B> {
  readonly event: (value: A) => Effect.Effect<R2, E2, unknown>
  readonly error: (cause: Cause<E>) => Effect.Effect<R2, E2, B>
  readonly end: Effect.Effect<R2, E2, B>
}

export function Sink<E, A, R2 = never, E2 = E, B = void>(
  event: Sink<E, A, R2, E2, B>['event'],
  error: Sink<E, A, R2, E2, B>['error'] = Effect.failCause as any,
  end: Sink<E, A, R2, E2, B>['end'] = Effect.unit as any,
): Sink<E, A, R2, E2, B> {
  return { event, error, end }
}

export function drain<E, A>(): Sink<E, A, never, E, void> {
  return Sink(() => Effect.unit)
}

export function reduce<E, B, A>(b: B, f: (b: B, a: A) => B): Sink<E, A, never, E, B> {
  let acc = b

  return Sink<E, A, never, E, B>(
    (a: A) => Effect.sync(() => (acc = f(acc, a))),
    undefined,
    Effect.sync(() => acc),
  )
}

// export namespace Sink {
//   export type InputErrorOf<T> = T extends Sink<infer R, any, any, any, any> ? R : never
//   export type EventOf<T> = T extends Sink<any, infer R, any, any, any> ? R : never
//   export type ResourcesOf<T> = T extends Sink<any, any, infer R, any, any> ? R : never
//   export type ErrorsOf<T> = T extends Sink<any, any, any, infer R, any> ? R : never
//   export type OutputOf<T> = T extends Sink<any, any, any, any, infer R> ? R : never
// }

export function mapInputEvent<A, B>(
  f: (a: A) => B,
): <E, R2, E2, C>(sink: Sink<E, B, R2, E2, C>) => Sink<E, A, R2, E2, C> {
  return (sink) => Sink(flow(f, sink.event), sink.error, sink.end)
}

export function mapInputEventEffect<A, R3, E3, B>(
  f: (a: A) => Effect.Effect<R3, E3, B>,
): <E, R2, E2, C>(sink: Sink<E, B, R2, E2, C>) => Sink<E, A, R2 | R3, E2 | E3, C> {
  return (sink) => Sink(flow(f, Effect.flatMap(sink.event)), sink.error, sink.end)
}

export function mapInputCause<E, E2>(
  f: (e: Cause<E>) => Cause<E2>,
): <A, R2, E3, B>(sink: Sink<E2, A, R2, E3, B>) => Sink<E, A, R2, E3, B> {
  return (sink) => Sink(sink.event, flow(f, sink.error), sink.end)
}

export function mapInputCauseEffect<E, R3, E3, E2>(
  f: (e: Cause<E>) => Effect.Effect<R3, E3, Cause<E2>>,
): <A, R2, E4, B>(sink: Sink<E2, A, R2, E4, B>) => Sink<E, A, R2 | R3, E3 | E4, B> {
  return (sink) => Sink(sink.event, flow(f, Effect.flatMap(sink.error)), sink.end)
}

export function provideEnvironment<R>(env: Env<R>) {
  return <E, A, E2, B>(sink: Sink<E, A, R, E2, B>): Sink<E, A, never, E2, B> =>
    Sink(
      flow(sink.event, Effect.provideEnvironment(env)),
      flow(sink.error, Effect.provideEnvironment(env)),
      Effect.provideEnvironment(env)(sink.end),
    )
}

export function provideLayer<R3, E3, R>(layer: Layer<R3, E3, R>) {
  return <E, A, E2, B>(sink: Sink<E, A, R, E2, B>): Sink<E, A, R3, E3 | E2, B> =>
    Sink(
      flow(sink.event, Effect.provideLayer(layer)),
      flow(sink.error, Effect.provideLayer(layer)),
      Effect.provideLayer(layer)(sink.end),
    )
}

export function mapOutput<B, C>(
  f: (b: B) => C,
): <E, A, R2, E2>(sink: Sink<E, A, R2, E2, B>) => Sink<E, A, R2, E2, C> {
  return (sink) => Sink(sink.event, flow(sink.error, Effect.map(f)), pipe(sink.end, Effect.map(f)))
}

export function mapOutputEffect<B, R3, E3, C>(
  f: (b: B) => Effect.Effect<R3, E3, C>,
): <E, A, R2, E2>(sink: Sink<E, A, R2, E2, B>) => Sink<E, A, R2 | R3, E2 | E3, C> {
  return (sink) =>
    Sink(sink.event, flow(sink.error, Effect.flatMap(f)), pipe(sink.end, Effect.flatMap(f)))
}

export function mapOutputCause<E2, E3>(f: (e: Cause<E2>) => Cause<E3>) {
  return <E, A, R2, B>(sink: Sink<E, A, R2, E2, B>): Sink<E, A, R2, E3, B> =>
    Sink(
      flow(sink.event, Effect.mapErrorCause(f)),
      flow(sink.error, Effect.mapErrorCause(f)),
      pipe(sink.end, Effect.mapErrorCause(f)),
    )
}

export function filterMap<A, B>(f: (a: A) => Maybe.Maybe<B>) {
  return <E, R2, E2, C>(sink: Sink<E, B, R2, E2, C>): Sink<E, A, R2, E2, C> =>
    Sink(
      flow(
        f,
        Maybe.fold(() => Effect.unit, sink.event),
      ),
      sink.error,
      sink.end,
    )
}
