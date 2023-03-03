/**
 * All the ways to interact with an Fx.
 * @since 1.0.0
 */

export {
  /**
   * Detect if an Fx is a MapFx instance. Useful for creating fusion optimizations.
   * @since 1.0.0
   * @category Type Guard
   */
  isMap,
  /**
   * Transform the values of an Fx.
   * @since 1.0.0
   * @category Operator
   */
  map
} from "./internal/operator/map"

export {
  /**
   * Run an Effect for all failures within an Fx making any interrupt end the Fx
   * instead of failing.
   */
  onNonInterruptCause
} from "./internal/operator/onNonInterruptCause"
