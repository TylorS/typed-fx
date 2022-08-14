import { Disposable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { FiberStatus } from '@/FiberStatus/index.js'
import { Of } from '@/Fx/Fx.js'
import { Trace } from '@/Trace/Trace.js'

export interface FiberRuntime<E, A> {
  /**
   * The current ID of the Fiber
   */
  readonly id: FiberId.Live

  /**
   * A gett for the current status of the Fiber
   */
  readonly status: () => FiberStatus

  /**
   * Starts the Fiber and returns a boolean if the Fiber is started.
   * This can be done only once, and additional calls with always return false.
   * This does not mean the Fiber is not running, you can use the status to understand what
   * is going on at anytime.
   */
  readonly start: () => boolean

  /**
   * Add a callback to be called when the Fiber has successfully closed.
   */
  readonly addObserver: (cb: (exit: Exit<E, A>) => void) => Disposable

  /**
   * Interrupt the Fiber from any fiber. Returns true if the Fiber was interrupted
   * and has closed, false if the Fiber is not currently interruptable.
   * If you'd like to wait for the Fiber to close, use the addObserver method.
   */
  readonly interruptAs: (id: FiberId) => Of<boolean>

  /**
   * Get the current Trace of the Fiber
   */
  readonly trace: () => Trace
}
