import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { Scope } from '@effect/core/io/Scope'

/**
 * TODOS:
 * scheduling, periodic
 * Map / As
 * Tap
 * MapError
 * OrElse/Effect
 * loop / scan / Effect
 * zipItems / withItems
 * combine
 * zip
 * snapshot/sample
 * filter
 * skipRepeats
 * takeWhile
 * skipWhile
 * skipAfter
 * takeUntil
 * skipUntil
 * until
 * since
 * during
 * throttle
 * debounce
 * Operator Fusion
 */

export interface Push<R, E, A> {
  run<R2>(emitter: Emitter<R2, E, A>): Effect.Effect<R | R2 | Scope, never, unknown>
}

export function Push<R, E, A>(run: Push<R, E, A>['run']): Push<R, E, A> {
  return {
    run,
  }
}

export namespace Push {
  export type ResourcesOf<T> = T extends Push<infer R, any, any> ? R : never
  export type ErrorsOf<T> = T extends Push<any, infer E, any> ? E : never
  export type OutputOf<T> = T extends Push<any, any, infer A> ? A : never
}

export interface Emitter<R, E, A> {
  readonly emit: (a: A) => Effect.Effect<R, never, unknown>
  readonly failCause: (e: Cause<E>) => Effect.Effect<R, never, unknown>
  readonly end: Effect.Effect<R, never, unknown>
}

export function Emitter<R, E, A>(
  emit: Emitter<R, E, A>['emit'],
  failCause: Emitter<R, E, A>['failCause'],
  end: Emitter<R, E, A>['end'],
): Emitter<R, E, A> {
  return {
    emit,
    failCause,
    end,
  }
}

export namespace Emitter {
  export type ResourcesOf<T> = T extends Emitter<infer R, any, any> ? R : never
  export type ErrorsOf<T> = T extends Emitter<any, infer E, any> ? E : never
  export type OutputOf<T> = T extends Emitter<any, any, infer A> ? A : never
}
