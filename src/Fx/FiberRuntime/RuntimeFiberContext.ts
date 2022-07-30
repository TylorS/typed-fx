import { Env } from '../Env/Env.js'
import { Semaphore } from '../Semaphore/Semaphore.js'
import { StackTrace } from '../StackTrace/StackTrace.js'

// TODO: Handle instruction count, yield to other fibers
// TODO: Trim the stack trace
// TODO: Track Child Fibers
// TODO: Supervisors
// TODO: Error Reporting
export interface RuntimeFiberContext {
  readonly env: Env<any>
  readonly concurrencyLevel: Semaphore
  readonly interruptStatus: boolean
  readonly trace: StackTrace
  readonly instructionCount: number
}
