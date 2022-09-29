import { pipe } from 'hkt-ts/function'

import { Env } from './Env.js'
import { FiberRef, get } from './FiberRef.js'
import { Fx } from './Fx.js'
import { now } from './constructors.js'
import { flatMap, uninterruptable } from './control-flow.js'
import { tuple } from './hkt.js'
import { getEnv, provide, provideEnv } from './intrinsics.js'

import { Service } from '@/Service/Service.js'

export interface Layer<R, E, S> extends FiberRef<R, E, Env<S>> {}

export namespace Layer {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  export type ResourcesOf<L> = FiberRef.ResourcesOf<L>
  export type ErrorsOf<L> = FiberRef.ErrorsOf<L>
  export type OutputOf<L> = FiberRef.OutputOf<L>
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export function Layer<R, E, S>(provider: Fx<R, E, Env<S>>): Layer<R, E, S> {
  return FiberRef(provider)
}

export function provideLayer<R, E, S>(layer: Layer<R, E, S>) {
  return <R2, E2, A>(fx: Fx<R2 | S, E2, A>): Fx<R | Exclude<R2, S>, E | E2, A> => {
    return pipe(
      layer,
      get,
      uninterruptable,
      flatMap((otherEnv) => pipe(fx, provide(otherEnv))),
    )
  }
}

export function provideLayers<Layers extends readonly Layer<any, any, any>[]>(...layers: Layers) {
  return <R, E, A>(
    fx: Fx<R | Layer.OutputOf<Layers[number]>, E, A>,
  ): Fx.Scoped<
    Exclude<R | Layer.ResourcesOf<Layers[number]>, A>,
    E | Layer.ErrorsOf<Layers[number]>,
    A
  > =>
    pipe(
      tuple(...layers.map(get)),
      uninterruptable,
      flatMap((otherEnvs) =>
        pipe(
          getEnv<R | Layer.ResourcesOf<Layers[number]>>(),
          flatMap((env) => pipe(fx, provideEnv(otherEnvs.reduce((a, b) => a.join(b), env)))),
        ),
      ),
    )
}

export function fromService<S>(service: Service<S>, impl: S): Layer<never, never, S> {
  return Layer(now(Env(service, impl)))
}
