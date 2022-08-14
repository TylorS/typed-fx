import { Disposable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { FiberStatus } from '@/FiberStatus/index.js'
import { Of } from '@/Fx/Fx.js'
import { Trace } from '@/Trace/Trace.js'

export interface FiberRuntime<E, A> {
  readonly id: FiberId.Live
  readonly status: () => FiberStatus
  readonly start: () => boolean
  readonly addObserver: (cb: (exit: Exit<E, A>) => void) => Disposable
  readonly interruptAs: (id: FiberId) => Of<boolean>
  readonly trace: () => Trace
}
