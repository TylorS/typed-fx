/**
 * All the ways to invoke an Fx including listening to events.
 * @since 1.0.0
 */

export {
  /**
   * Listen to the events of an Fx and run an Effect for each event.
   * The resulting Effect will resolve with any error that has been raised
   * or successfully with void.
   * @since 1.0.0
   */
  observe
} from "./internal/run/observe"
