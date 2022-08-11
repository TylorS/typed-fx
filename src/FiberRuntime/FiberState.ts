import { Env } from '@/Env/Env.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Semaphore } from '@/Semaphore/Semaphore.js'
import { Stack } from '@/Stack/index.js'
import { Trace } from '@/Trace/Trace.js'

export interface FiberState {
  readonly concurrencyLevel: Stack<Semaphore>
  readonly interruptedBy: ReadonlySet<FiberId>
  readonly env: Stack<Env<any>>
  readonly trace: Stack<Trace>
  readonly opCount: number
}
