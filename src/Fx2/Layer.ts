import { pipe } from 'hkt-ts'

import { Env } from './Env.js'
import { Fx } from './Fx.js'
import { flatMap, uninterruptable } from './control-flow.js'
import { getEnv, provideEnv } from './intrinsics.js'

export interface Layer<R, E, S> extends Fx.Scoped<R, E, Env<S>> {}

export namespace Layer {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  export type ResourcesOf<L> = L extends Layer<infer R, infer _E, infer _A> ? R : never
  export type ErrorsOf<L> = L extends Layer<infer _R, infer E, infer _A> ? E : never
  export type OutputOf<L> = L extends Layer<infer _R, infer _E, infer A> ? A : never
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export function provideLayer<R, E, S>(layer: Layer<R, E, S>) {
  return <R2, E2, A>(fx: Fx<R2 | S, E2, A>): Fx.Scoped<Exclude<R | R2, S>, E | E2, A> => {
    return pipe(
      layer,
      uninterruptable,
      flatMap((otherEnv) =>
        pipe(
          getEnv<R | R2>(),
          flatMap((env) => pipe(fx, provideEnv(env.join(otherEnv)))),
        ),
      ),
    ) as Fx.Scoped<Exclude<R | R2, S>, E | E2, A>
  }
}

export function provideLayers<Layers extends readonly Layer<any, any, any>[]>(
  ...layers: Layers
): <R, E, A>(
  fx: Fx<R | Layer.OutputOf<Layers[number]>, E, A>,
) => Fx.Scoped<
  Exclude<R | Layer.ResourcesOf<Layers[number]>>,
  E | Layer.ErrorsOf<Layers[number]>,
  A
> {
  return pipe(
    zipAll(layers),
    uninterruptable,
    flatMap((otherEnv) =>
      pipe(
        getEnv<R | R2>(),
        flatMap((env) => pipe(fx, provideEnv(env.join(otherEnv)))),
      ),
    ),
  )
}
