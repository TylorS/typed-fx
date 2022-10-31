import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { Scope } from '@effect/core/io/Scope'

export interface Fx<R, E, A> {
  readonly _R: () => R
  readonly _E: () => E
  readonly _A: () => A

  run<R2>(emitter: Emitter<R2, E, A>): Effect.Effect<R | R2 | Scope, never, unknown>
}

export function Fx<R, E, A>(run: Fx<R, E, A>['run']): Fx<R, E, A> {
  return {
    run,
  } as Fx<R, E, A>
}

export namespace Fx {
  /* eslint-disable @typescript-eslint/no-unused-vars */

  export type ResourcesOf<T> = [T] extends [Fx<infer R, infer _E, infer _A>] ? R : never
  export type ErrorsOf<T> = [T] extends [Fx<infer _R, infer E, infer _A>] ? E : never
  export type OutputOf<T> = [T] extends [Fx<infer _R, infer _E, infer A>] ? A : never

  /* eslint-enable @typescript-eslint/no-unused-vars */
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
