/**
 * All the ways to interact with an Fx.
 * @since 1.0.0
 */

export {
  /**
   * Detect if an Fx is a FromEffect instance. Useful for creating fusion optimizations.
   * @since 1.0.0
   * @category Type Guard
   */
  isMap,
  /**
   * Construct a Fx from an Effect.
   * @since 1.0.0
   * @category Operator
   */
  map
} from "./internal/operator/map"
