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

export {
  /**
   * Merge together multiple Fx instances into a single Fx that emits all of their
   * values as soon as possible.
   * @since 1.0.0
   * @category Operator
   */
  merge,
  mergeAll
} from "./internal/operator/merge"

export {
  /**
   * Effeciently share an underlying Fx with multiple observers.
   * @since 1.0.0
   * @category Operator
   */
  multicast
} from "./internal/operator/multicast"

export {
  /**
   * Effeciently share an underlying Fx with multiple observers and replay
   * the latest value, when available, to late subscribers.
   * @since 1.0.0
   * @category Operator
   */
  hold
} from "./internal/operator/hold"

export {
  /**
   * Construct an Fx from the values of another Fx that and "flatten" them back into
   * the current Fx.
   * @since 1.0.0
   * @category Operator
   */
  flatMap,
  flatten
} from "./internal/operator/flatMap"

export {
  /**
   * Delay all of the events of an Fx by a specific duration.
   * @since 1.0.0
   * @category Operator
   */
  delay
} from "./internal/operator/delay"
