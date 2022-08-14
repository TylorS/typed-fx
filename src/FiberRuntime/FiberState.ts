import { Env } from '@/Env/Env.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Semaphore } from '@/Semaphore/Semaphore.js'
import { Stack } from '@/Stack/index.js'
import { Trace } from '@/Trace/Trace.js'

export interface FiberState {
  /**
   * The current concurrency level of the Fiber
   */
  readonly concurrencyLevel: Stack<Semaphore>

  /**
   * The current interruptable status of the Fiber
   */
  readonly interruptStatus: Stack<boolean>

  /**
   * A set of fibers that are currently waiting for the Fiber to be interrupted.
   */
  readonly interruptedBy: ReadonlySet<FiberId>

  /**
   * The current Environment the Fiber is using.
   */
  readonly env: Stack<Env<any>>

  /**
   * The Stack Trace
   */
  readonly trace: Stack<Trace>

  /**
   * The current opCount of the Fiber
   */
  readonly opCount: number
}
