import type { Maybe } from 'hkt-ts/Maybe'

import type { Fiber } from '@/Fiber/Fiber'
import type { FiberScope } from '@/FiberScope/index'
import type { FiberStatus } from '@/FiberStatus/FiberStatus'
import type { Platform } from '@/Platform/Platform'
import type { Scheduler } from '@/Scheduler/Scheduler'
import type { StackTrace } from '@/StackTrace/StackTrace'
import type { Supervisor } from '@/Supervisor/Supervisor'

export class FiberContext {
  constructor(
    readonly scope: FiberScope,
    readonly status: FiberStatus<any, any>,
    readonly stack: StackTrace,
    readonly scheduler: Scheduler,
    readonly supervisor: Supervisor,
    readonly platform: Platform,
    readonly parent: Maybe<FiberContext>,
    readonly children: ReadonlySet<Fiber<any, any>>,
  ) {}
}
