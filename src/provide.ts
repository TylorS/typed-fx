import * as Effect from '@effect/core/io/Effect'
import { Layer } from '@effect/core/io/Layer'
import { pipe } from '@fp-ts/data/Function'
import * as Env from '@tsplus/stdlib/service/Env'
import { Tag } from '@tsplus/stdlib/service/Tag'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export const provideEnvironment =
  <R>(env: Env.Env<R>) =>
  <E, A, E1>(fx: Fx<R, E, A, E1>): Fx<never, E, A, E1> =>
    Fx(
      <R2, E2, B>(sink: Sink<E, A, R2, E2, B>): Effect.Effect<R2, E1 | E2, B> =>
        pipe(
          fx.run(sink),
          Effect.provideSomeEnvironment((e: Env.Env<R2>): Env.Env<R | R2> => e.merge<R2, R>(env)),
        ),
    )

export const provideSomeEnvironment =
  <R3>(env: Env.Env<R3>) =>
  <R, E, A, E1>(fx: Fx<R | R3, E, A, E1>): Fx<R, E, A, E1> =>
    Fx(
      <R2, E2, B>(sink: Sink<E, A, R2, E2, B>): Effect.Effect<R | R2, E1 | E2, B> =>
        pipe(
          fx.run(sink),
          Effect.provideSomeEnvironment((e) => e.merge(env)),
        ),
    )

export const provideLayer =
  <RI, E3, RO>(layer: Layer<RI, E3, RO>) =>
  <E, A, E1>(fx: Fx<RO, E, A, E1>): Fx<RI, E, A, E1 | E3> =>
    Fx((sink) => pipe(fx.run(sink), Effect.provideSomeLayer(layer)))

export const provideSomeLayer =
  <RI, E3, RO>(layer: Layer<RI, E3, RO>) =>
  <R, E, A, E1>(fx: Fx<R | RO, E, A, E1>): Fx<R | RI, E, A, E1 | E3> =>
    Fx((sink) => pipe(fx.run(sink), Effect.provideSomeLayer(layer)))

export const provideService =
  <T>(tag: Tag<T>, resource: T) =>
  <R, E, A, E1>(fx: Fx<R | T, E, A, E1>): Fx<R, E, A, E1> =>
    Fx((sink) => pipe(fx.run(sink), Effect.provideService(tag, resource)))

export const provideServiceEffect =
  <T, R3, E3>(tag: Tag<T>, effect: Effect.Effect<R3, E3, T>) =>
  <R, E, A, E1>(fx: Fx<R | T, E, A, E1>): Fx<R | R3, E, A, E1 | E3> =>
    Fx((sink) => pipe(fx.run(sink), Effect.provideServiceEffect(tag, effect)))
