import { pipe } from 'hkt-ts'
import { foldLeft } from 'hkt-ts/Array'

import { Env, makeIdentity } from '@/Env/Env.js'
import { FiberRef, make } from '@/FiberRef/FiberRef.js'
import * as Fx from '@/Fx/Fx.js'
import { Service } from '@/Service/Service.js'

export interface Layer<R, E, A> extends FiberRef<R, E, Env<A>> {}

export interface AnyLayer extends Layer<any, any, any> {}

export function Layer<R, E, A>(provider: Fx.Fx<R, E, Env<A>>): Layer<R, E, A> {
  return make(provider)
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _R : never
export type ErrorsOf<T> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _E : never
export type OutputOf<T> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export function fromService<S, R, E>(service: Service<S>, fx: Fx.Fx<R, E, S>): Layer<R, E, S> {
  return Layer(
    pipe(
      fx,
      Fx.map((a) => Env(service, a)),
    ),
  )
}

export function combine<Layers extends ReadonlyArray<AnyLayer>>(...layers: Layers) {
  return Layer<ResourcesOf<Layers[number]>, ErrorsOf<Layers[number]>, OutputOf<Layers[number]>>(
    pipe(Fx.zipAll(layers.map((layer) => Fx.get(layer))), Fx.map(foldLeft(makeIdentity()))),
  )
}

export function compose<R2, E2, B>(second: Layer<R2, E2, B>) {
  return <R, E, A>(first: Layer<R, E, A>) =>
    Layer(
      pipe(
        first,
        Fx.get,
        Fx.flatMap((envA) =>
          pipe(
            second,
            Fx.get,
            Fx.provideSome(envA),
            Fx.map((envB) => envA.join(envB)),
          ),
        ),
      ),
    )
}
