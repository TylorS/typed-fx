/**
 * All the ways to construct an Fx.
 * @since 1.0.0
 */

export {
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
  isFromEffect
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
