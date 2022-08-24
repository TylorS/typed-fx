import { Branded } from 'hkt-ts/Branded'
import { pipe } from 'hkt-ts/function'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/Fx.js'
import { Provideable } from '@/Provideable/index.js'
import { Scope } from '@/Scope/Scope.js'
import { Service } from '@/Service/Service.js'

export interface Layer<R, E, A> {
  readonly id: LayerId
  readonly build: (scope: Scope) => Fx.Fx<R, E, Env<A>>
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

export type LayerId = Branded<{ readonly LayerId: LayerId }, symbol>
export const LayerId = Branded<LayerId>()

export function Layer<R, E, A>(id: LayerId, build: Layer<R, E, A>['build']): Layer<R, E, A> {
  return {
    id,
    build,
  }
}

export function fromFx<S, R, E, A extends S>(s: Service<S>, fx: Fx.Fx<R | Scope, E, A>) {
  return Layer(LayerId(s), (scope) =>
    pipe(
      fx,
      Fx.provideService(Scope, scope),
      Fx.map((a) => Env(s, a)),
    ),
  )
}

export function fromProvideable<R>(p: Provideable<R>) {
  return Layer(LayerId(Symbol(p.name)), () => Fx.fromLazy(() => Provideable.get(p)))
}
