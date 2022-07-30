import { Maybe } from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberId } from '../FiberId/FiberId.js'
import { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { Scheduler } from '../Scheduler/Scheduler.js'
import { Trace } from '../Trace/Trace.js'

export interface FiberContext {
  readonly id: FiberId.Live
  readonly trace: Trace
  readonly fiberRefs: FiberRefs
  readonly scheduler: Scheduler
  readonly concurrencyLevel: NonNegativeInteger
  readonly interruptStatus: boolean
  readonly parent: Maybe<FiberContext>
}
