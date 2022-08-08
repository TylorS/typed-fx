import { Fx } from '../Fx/Fx.js'
import { Scope } from '../Scope/Scope.js'

import { Service } from '@/Service/index.js'

export interface Layer<R, E, A> {
  readonly service: Service<A>
  readonly provider: Fx<R | Scope, E, A>
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

export function Layer<A, R, E>(service: Service<A>, provider: Fx<R | Scope, E, A>): Layer<R, E, A> {
  return {
    service,
    provider,
  }
}
