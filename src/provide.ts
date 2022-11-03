import * as Effect from '@effect/core/io/Effect'
import * as Layer from '@effect/core/io/Layer'
import * as Scope from '@effect/core/io/Scope'
import { pipe } from '@fp-ts/data/Function'
import { Env } from '@tsplus/stdlib/service/Env'
import { Tag } from '@tsplus/stdlib/service/Tag'

import { Emitter, Fx } from './Fx.js'

export function provideSomeEnvironment<R2>(env: Env<R2>) {
  return <R, E, A>(fx: Fx<R | R2, E, A>): Fx<Exclude<R, R2>, E, A> =>
    Fx((emitter) =>
      pipe(
        fx.run(emitter),
        Effect.provideSomeEnvironment(
          (e: Env<Exclude<R, R2> | Emitter.ResourcesOf<typeof emitter> | Scope.Scope>) =>
            (e as Env<R | Emitter.ResourcesOf<typeof emitter> | Scope.Scope>).merge(env),
        ),
      ),
    )
}

export function provideEnvironment<R>(env: Env<R>) {
  return provideSomeEnvironment(env) as <E, A>(fx: Fx<R, E, A>) => Fx<never, E, A>
}

export function provideSomeLayer<RI, E2, RO>(layer: Layer.Layer<RI, E2, RO>) {
  return <R, E, A>(fx: Fx<R | RO, E, A>): Fx<RI | Exclude<R, RO>, E | E2, A> =>
    Fx(<R2>(emitter: Emitter<R2, E | E2, A>) =>
      Effect.scopeWith((scope) =>
        pipe(
          layer,
          Layer.buildWithScope(scope),
          Effect.flatMap((ro) => pipe(fx, provideSomeEnvironment(ro)).run(emitter)),
          Effect.foldCauseEffect((c) => emitter.failCause(c), Effect.succeed),
        ),
      ),
    )
}

export function provideLayer<RI, E2, RO>(layer: Layer.Layer<RI, E2, RO>) {
  return provideSomeLayer(layer) as <E, A>(fx: Fx<RO, E, A>) => Fx<RI, E | E2, A>
}

export function provideService<S>(
  tag: Tag<S>,
  service: S,
): <R, E, A>(fx: Fx<S | R, E, A>) => Fx<Exclude<R, S>, E, A> {
  return provideSomeEnvironment(Env(tag, service))
}

export function provideServiceEffect<S, R2, E2>(tag: Tag<S>, service: Effect.Effect<R2, E2, S>) {
  return <R, E, A>(fx: Fx<R | S, E, A>): Fx<R2 | Exclude<R, S>, E | E2, A> =>
    Fx((emitter) =>
      pipe(
        fx.run(emitter),
        Effect.provideServiceEffect(tag, service),
        Effect.foldCauseEffect(emitter.failCause, Effect.succeed),
      ),
    )
}
