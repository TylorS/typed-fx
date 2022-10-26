import * as Effect from '@effect/core/io/Effect'
import * as Layer from '@effect/core/io/Layer'
import * as Scope from '@effect/core/io/Scope'
import { pipe } from '@fp-ts/data/Function'
import { Env } from '@tsplus/stdlib/service/Env'
import { Tag } from '@tsplus/stdlib/service/Tag'

import { Emitter, Push } from './Push.js'

export function provideSomeEnvironment<R2>(env: Env<R2>) {
  return <R, E, A>(push: Push<R | R2, E, A>): Push<Exclude<R, R2>, E, A> =>
    Push((emitter) =>
      pipe(
        push.run(emitter),
        Effect.provideSomeEnvironment(
          (e: Env<Exclude<R, R2> | Emitter.ResourcesOf<typeof emitter> | Scope.Scope>) =>
            (e as Env<R | Emitter.ResourcesOf<typeof emitter> | Scope.Scope>).merge(env),
        ),
      ),
    )
}

export function provideEnvironment<R>(env: Env<R>) {
  return provideSomeEnvironment(env) as <E, A>(push: Push<R, E, A>) => Push<never, E, A>
}

export function provideSomeLayer<RI, E2, RO>(layer: Layer.Layer<RI, E2, RO>) {
  return <R, E, A>(push: Push<R | RO, E, A>): Push<RI | Exclude<R, RO>, E | E2, A> =>
    Push(<R2>(emitter: Emitter<R2, E | E2, A>) =>
      Effect.acquireUseReleaseExit(
        Scope.make,
        (scope) =>
          pipe(
            layer,
            Layer.buildWithScope(scope),
            Effect.flatMap((ro) => pipe(push, provideSomeEnvironment(ro)).run(emitter)),
            Effect.foldCauseEffect((c) => emitter.failCause(c), Effect.succeed),
          ),
        (scope, exit) => pipe(scope, Scope.close(exit)),
      ),
    )
}

export function provideLayer<RI, E2, RO>(layer: Layer.Layer<RI, E2, RO>) {
  return provideSomeLayer(layer) as <E, A>(push: Push<RO, E, A>) => Push<RI, E | E2, A>
}

export function provideService<S>(
  tag: Tag<S>,
  service: S,
): <R, E, A>(push: Push<S | R, E, A>) => Push<Exclude<R, S>, E, A> {
  return provideSomeEnvironment(Env(tag, service))
}

export function provideServiceEffect<S, R2, E2>(tag: Tag<S>, service: Effect.Effect<R2, E2, S>) {
  return <R, E, A>(push: Push<R, E, A>): Push<R | R2, E | E2, A> =>
    Push((emitter) =>
      pipe(
        push.run(emitter),
        Effect.provideServiceEffect(tag, service),
        Effect.foldCauseEffect(emitter.failCause, Effect.succeed),
      ),
    )
}
