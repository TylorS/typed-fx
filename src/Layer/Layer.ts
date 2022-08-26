import { pipe } from 'hkt-ts/function'

import * as Fx from '@/Fx/Fx.js'
import { Scope } from '@/Scope/Scope.js'
import { Service } from '@/Service/Service.js'

// TODO: Global Layers
// TODO: Refreshing
// TODO: Combinators for providing fallbacks
// TODO: Combinators for composing layers

export interface Layer<R, E, A> {
  readonly service: Service<A>
  readonly build: (scope: Scope) => Fx.Fx<R, E, A>
}

export type AnyLayer =
  | Layer<any, any, any>
  | Layer<never, never, any>
  | Layer<never, any, any>
  | Layer<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends Layer<infer _R, infer _E, infer _A> ? _R : never
export type ErrorsOf<T> = T extends Layer<infer _R, infer _E, infer _A> ? _E : never
export type OutputOf<T> = T extends Layer<infer _R, infer _E, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export function Layer<R, E, A>(
  service: Service<A>,
  build: Layer<R, E, A>['build'],
): Layer<R, E, A> {
  return {
    service,
    build,
  }
}

export function fromFx<S, R, E, A extends S>(
  s: Service<S>,
  fx: Fx.Fx<R | Scope, E, A>,
): Layer<R, E, S> {
  return Layer(s, (scope) => pipe(fx, Fx.provideService(Scope, scope)))
}
