import { flow, pipe } from 'hkt-ts/function'

import * as Fx from '@/Fx/Fx.js'
import { Scope } from '@/Scope/Scope.js'
import { Service } from '@/Service/Service.js'

export interface Layer<R, E, A> {
  readonly service: Service<A>
  readonly build: (scope: Scope) => Fx.Fx<R, E, A>
}

export type AnyLayer = Layer<any, any, any>

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

export function orElse<E, A, R2, E2, R3, E3, B extends A>(
  orElse: (e: E) => Fx.Fx<R2, E2, Layer<R3, E3, B>>,
) {
  return <R>(layer: Layer<R, E, A>): Layer<R | R2 | R3, E2 | E3, A> => {
    return Layer(layer.service, (scope) =>
      pipe(
        scope,
        layer.build,
        Fx.orElse(
          flow(
            orElse,
            Fx.flatMap((l) => l.build(scope)),
          ),
        ),
      ),
    )
  }
}
