/**
 * All the ways to construct an Fx.
 * @since 1.0.0
 */

export {
  /**
   * Construct a failed Fx from an error.
   * @since 1.0.0
   * @category Constructor
   */
  fail,
  /**
   * Construct a failed Fx from a Cause.
   * @since 1.0.0
   * @category Constructor
   */
  failCause,
  /**
   * Construct a Fx from an Effect.
   * @since 1.0.0
   * @category Constructor
   */
  fromEffect,
  /**
   * Detect if an Fx is a FromEffect instance. Useful for creating fusion optimizations.
   * @since 1.0.0
   * @category Type Guard
   */
  isFromEffect,
  /**
   * Construct a successful Fx from a value.
   * @since 1.0.0
   * @category Constructor
   */
  succeed
} from "./internal/constructor/fromEffect"

export {
  /**
   * Construct a Fx from an Effect returning an Fx.
   * @since 1.0.0
   * @category Constructor
   */
  fromFxEffect
} from "./internal/constructor/fromFxEffect"

export {
  /**
   * Construct a Fx from an Generator of Effects returning an Fx.
   * @since 1.0.0
   * @category Constructor
   */
  gen
} from "./internal/constructor/gen"

export {
  /**
   * Construct a Fx from an array of values.
   * @since 1.0.0
   * @category Constructor
   */
  fromArray
} from "./internal/constructor/fromArray"

export {
  /**
   * Construct an Fx which will run with a value at a specific delay from the time of subscription.
   * @since 1.0.0
   * @category Constructor
   */ at
} from "./internal/constructor/at"

export {
  /**
   * Lazily construct an Fx from a function that will not fail.
   * @since 1.0.0
   * @category Constructor
   */ suspendSucceed
} from "./internal/constructor/suspendSucceed"
