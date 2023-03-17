/**
 * A `Fx` is a push-based reactive data structure that declaratively represents multi-shot Effects.
 * An Fx can call its provided Sink 0 or more times, and then call Sink.error or Sink.end exactly once.
 *
 * With an Fx you can represent workflows that exist over time like RPC, DOM Event, and so much more.
 * You can skip, take, filter, and transform the events of an Fx. You can also easily create your own.
 *
 * @since 1.0.0
 */

import type { TypeLambda } from "@effect/data/HKT"
import type { Cause } from "@effect/io/Cause"
import type { Trace } from "@effect/io/Debug"
import { methodWithTrace } from "@effect/io/Debug"
import type { Effect, EffectGen } from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import type { Chunk } from "@typed/fx/internal/_externals"

/**
 * A `Fx` is a push-based reactive data structure that declaratively represents a multi-shot Effects.
 * An Fx can call its provided Sink 0 or more times, and then call Sink.error or Sink.end exactly once.
 *
 * It makes use of Scope to ensure that all resources are properly released including any "nested" Fx
 * being run by higher-order Fx operators like flatMap or switchMap but not limited to.
 *
 * Fx extends the EffectGen interface to allow being yield*ed in a Generator. It is a shortcut
 * to runCollectAll and is mostly useful in tests.
 * @since 1.0.0
 * @category Model
 */
export interface Fx<out Services, out Errors, out Output> extends EffectGen<Services, Errors, Chunk.Chunk<Output>> {
  readonly _tag: string

  /**
   * The main API for running an Fx.
   * @macro traced
   */
  run(
    sink: Sink<Errors, Output>
  ): Effect<Services | Scope, never, unknown>

  /**
   * Add a trace to an Fx.
   */
  traced(trace: Trace): Fx<Services, Errors, Output>

  /**
   * Transform the output of an Fx.
   */
  transform<R2 = never, E2 = never>(
    f: (effect: Effect<Services | Scope, never, unknown>) => Effect<R2 | Scope, E2, unknown>
  ): Fx<Exclude<R2, Scope>, Errors | E2, Output>
}

export namespace Fx {
  /**
   * Extract the services of an Fx.
   * @since 1.0.0
   * @category Type-level
   */
  export type ServicesOf<T> = T extends Fx<infer Services, any, any> ? Services : never

  /**
   * Extract the errors of an Fx.
   * @since 1.0.0
   * @category Type-level
   */
  export type ErrorsOf<T> = T extends Fx<any, infer Errors, any> ? Errors : never

  /**
   * Extract the output of an Fx.
   * @since 1.0.0
   * @category Type-level
   */
  export type OutputOf<T> = T extends Fx<any, any, infer Output> ? Output : never

  export type Succeed<A> = Fx<never, never, A>
  export type Fail<E> = Fx<never, E, never>
  export type WithError<E, A> = Fx<never, E, A>
  export type WithService<R, A> = Fx<R, never, A>
}

/**
 * A `Sink` is receiver of a `Fx`'s events and errors. It describes event and error.
 * @since 1.0.0
 * @category Model
 */
export interface Sink<in Errors, in Output> {
  readonly event: (event: Output) => Effect<never, never, unknown>
  readonly error: (error: Cause<Errors>) => Effect<never, never, unknown>
  readonly end: () => Effect<never, never, unknown>
}

/**
 * Construct a Sink.
 * @since 1.0.0
 * @category Constructor
 */
export function Sink<Errors, Output>(
  event: Sink<Errors, Output>["event"],
  error: Sink<Errors, Output>["error"],
  end: Sink<Errors, Output>["end"]
): Sink<Errors, Output> {
  const sink: Sink<Errors, Output> = {
    event: methodWithTrace((trace, restore) => (a) => restore(event)(a).traced(trace)),
    error: methodWithTrace((trace, restore) => (e) => restore(error)(e).traced(trace)),
    end: methodWithTrace((trace, restore) => () => restore(end)().traced(trace))
  }

  return sink
}

/**
 * TypeLambda for typeclasses using Fx.
 * @since 1.0.0
 * @category Type Lambda
 */
export interface FxTypeLambda extends TypeLambda {
  readonly type: Fx<this["Out2"], this["Out1"], this["Target"]>
}
