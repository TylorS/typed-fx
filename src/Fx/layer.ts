import { pipe } from 'hkt-ts'

import * as Fx from './Fx.js'

import { Env, concat } from '@/Env/Env.js'
import { Layer } from '@/Layer/Layer.js'

// TODO: Handle Memoization of Layers

export function provideLayer<R2, E2, S>(layer: Layer<R2, E2, S>) {
  return <R, E, A>(fx: Fx.Fx<R | S, E, A>): Fx.Fx<Exclude<R | R2, S>, E | E2, A> =>
    Fx.access((e: Env<Exclude<R | R2, S>>) =>
      pipe(
        Fx.getFiberContext,
        Fx.flatMap(({ scope }) =>
          pipe(
            layer.build(scope),
            Fx.map((built: Env<S>) => concat(built)(e as Env<R | R2>)),
            Fx.flatMap((e) => pipe(fx, Fx.provide(e))),
            Fx.ensuring(scope.close),
          ),
        ),
        Fx.provide(e as Env<R | R2>),
      ),
    )
}
