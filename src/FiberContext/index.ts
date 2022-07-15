import type { Maybe } from 'hkt-ts/Maybe'

import type { Fiber } from '@/Fiber/Fiber'
import type { FiberId } from '@/FiberId/FiberId'
import type { FiberRefs } from '@/FiberRefs/FiberRefs'
import type { FiberStatus } from '@/FiberStatus/FiberStatus'
import type { Platform } from '@/Platform/Platform'
import type { Scheduler } from '@/Scheduler/Scheduler'
import type { Closeable } from '@/Scope/Scope'
import type { Semaphore } from '@/Semaphore/Semaphore'
import type { StackTrace } from '@/StackTrace/StackTrace'
import type { Supervisor } from '@/Supervisor/Supervisor'

export class FiberContext {
  constructor(
    readonly id: FiberId,
    readonly status: FiberStatus<any, any>,
    readonly semaphore: Semaphore,
    readonly fiberRefs: FiberRefs,
    readonly scope: Closeable,
    readonly scheduler: Scheduler,
    readonly supervisor: Supervisor<any>,
    readonly platform: Platform,
    readonly parent: Maybe<FiberContext>,
    readonly children: ReadonlySet<Fiber<any, any>>,
    readonly stack: StackTrace,
  ) {}
}
