/**
 * A `Fx` is a push-based reactive data structure that declaratively represents multi-shot Effects.
 * An Fx can call its provided Sink 0 or more times, and then call Sink.error or Sink.end exactly once.
 *
 * With an Fx you can represent workflows that exist over time like RPC, DOM Event, and so much more.
 * You can skip, take, filter, and transform the events of an Fx. You can also easily create your own.
 *
 * @since 1.0.0
 */

import type { Cause } from "@effect/io/Cause"
import type { Effect } from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"

/**
 * A `Fx` is a push-based reactive data structure that declaratively represents a multi-shot Effects.
 * An Fx can call its provided Sink 0 or more times, and then call Sink.error or Sink.end exactly once.
 * @since 1.0.0
 * @category Model
 */
export interface Fx<out Services, out Errors, out Output> {
  // A unique tag for this Fx, used to distinguish between different Fx types.
  readonly _tag: string

  /**
   * The main API for
   */
  readonly run: <Services2>(
    services: Sink<Services2, Errors, Output>
  ) => Effect<Services | Services2 | Scope, never, unknown>
}

/**
 * A `Sink` is receiver of a `Fx`'s events and errors. It describes event and error.
 * @since 1.0.0
 * @category Model
 */
export interface Sink<out Services, in Errors, in Output> {
  readonly event: (event: Output) => Effect<Services, never, unknown>
  readonly error: (error: Cause<Errors>) => Effect<Services, never, unknown>
  readonly end: Effect<Services, never, unknown>
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
  return { event, error, end }
}
