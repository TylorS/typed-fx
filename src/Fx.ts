import { methodWithTrace } from "@effect/data/Debug"
import { identity } from "@effect/data/Function"
import type { Cause } from "@effect/io/Cause"
import type { Effect } from "@effect/io/Effect"
import type * as Runtime from "@effect/io/Runtime"

export const FxTypeId = Symbol.for("@typed/fx/Fx")
export type FxTypeId = typeof FxTypeId

export interface Fx<R, E, A> {
  readonly [FxTypeId]: {
    readonly _R: (_: never) => R
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }

  readonly run: <R2>(sink: Sink<R2, E, A>) => Effect<R | R2, never, void>
}

export function Fx<R, E, A>(
  run: Fx<R, E, A>["run"]
): Fx<R, E, A> {
  return {
    [FxTypeId]: {
      _R: identity,
      _E: identity,
      _A: identity
    },
    run: methodWithTrace((trace) => (sink) => run(sink).traced(trace))
  }
}

export namespace Fx {
  export type Cancel = Runtime.Cancel<never, void>

  export type ResourcesOf<T> = [T] extends [never] ? never : T extends Fx<infer R, any, any> ? R : never

  export type ErrorsOf<T> = [T] extends [never] ? never : T extends Fx<any, infer E, any> ? E : never

  export type OutputOf<T> = [T] extends [never] ? never : T extends Fx<any, any, infer A> ? A : never
}

export interface Sink<R, E, A> {
  readonly event: (a: A) => Effect<R, never, void>
  readonly error: (e: Cause<E>) => Effect<R, never, void>
}

export function Sink<A, R, E, R2>(
  event: (a: A) => Effect<R, never, void>,
  error: (e: Cause<E>) => Effect<R2, never, void>
): Sink<R | R2, E, A> {
  return {
    event: methodWithTrace((trace) => (a: A) => event(a).traced(trace)),
    error: methodWithTrace((trace) => (e: Cause<E>) => error(e).traced(trace))
  }
}
