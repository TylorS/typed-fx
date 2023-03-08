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
import type { Effect } from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"

/**
 * A `Fx` is a push-based reactive data structure that declaratively represents a multi-shot Effects.
 * An Fx can call its provided Sink 0 or more times, and then call Sink.error or Sink.end exactly once.
 *
 * It makes use of Scope to ensure that all resources are properly released including any "nested" Fx
 * being run by higher-order Fx operators like flatMap or switchMap but not limited to.
 * @since 1.0.0
 * @category Model
 */
export interface Fx<out Services, out Errors, out Output> {
  readonly _tag: string

  /**
   * The main API for running an Fx.
   * @macro traced
   */
  run<Services2>(
    services: Sink<Services2, Errors, Output>
  ): Effect<Services | Services2 | Scope, never, unknown>

  /**
   * Add a trace to an Fx.
   */
  traced(trace: Trace): Fx<Services, Errors, Output>
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
}

/**
 * A `Sink` is receiver of a `Fx`'s events and errors. It describes event and error.
 * @since 1.0.0
 * @category Model
 */
export interface Sink<out Services, in Errors, in Output> {
  readonly event: (event: Output) => Effect<Services, never, unknown>
  readonly error: (error: Cause<Errors>) => Effect<Services, never, unknown>
  readonly end: () => Effect<Services, never, unknown>
}

/**
 * Construct a Sink.
 * @since 1.0.0
 * @category Constructor
 */
export function Sink<Services1, Services2, Services3, Errors, Output>(
  event: Sink<Services1, Errors, Output>["event"],
  error: Sink<Services2, Errors, Output>["error"],
  end: Sink<Services3, Errors, Output>["end"]
): Sink<Services1 | Services2 | Services3, Errors, Output> {
  const sink: Sink<Services1 | Services2 | Services3, Errors, Output> = {
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
