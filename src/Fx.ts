import * as Effect from '@effect/core/io/Effect'

import { Sink } from './Sink.js'

/**
 * TODOS:
 * combine / combineAll
 * zip / zipAll
 * snapshot / sample
 * slice / take / skip
 * takeWhile / skipWhile
 * takeUntil / skipUntil
 * takeAfter / skipAfter
 * until
 * since
 * during
 * throttle
 * debounce
 * multicast
 * hold
 */

export interface Fx<R, E, A, E1 = never> {
  readonly run: <R2, E2, B>(sink: Sink<E, A, R2, E2, B>) => Effect.Effect<R | R2, E1 | E2, B>
}

export function Fx<R, E, A, E1 = never>(run: Fx<R, E, A, E1>['run']): Fx<R, E, A, E1> {
  return { run }
}

export namespace Fx {
  export type ResourcesOf<T> = T extends Fx<infer R, any, any, any> ? R : never
  export type ErrorsOf<T> = T extends Fx<any, infer E, any, any> ? E : never
  export type OutputOf<T> = T extends Fx<any, any, infer A, any> ? A : never
  export type ReturnErrorsOf<T> = T extends Fx<any, any, any, infer E1> ? E1 : never
}
