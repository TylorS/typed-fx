import { Maybe } from 'hkt-ts/Maybe'

import { Env } from '@/Env/Env'
import { FiberContext } from '@/FiberContext/index'
import { FiberId } from '@/FiberId/FiberId'
import { FiberRefs } from '@/FiberRefs/FiberRefs'
import { Platform } from '@/Platform/Platform'
import { Scheduler } from '@/Scheduler/Scheduler'
import { Closeable } from '@/Scope/Scope'
import { Supervisor } from '@/Supervisor/Supervisor'

export interface FiberRuntimeParams<R> {
  readonly fiberId: FiberId
  readonly env: Env<R>
  readonly scheduler: Scheduler
  readonly supervisor: Supervisor<any>
  readonly fiberRefs: FiberRefs
  readonly scope: Closeable
  readonly platform: Platform
  readonly parent: Maybe<FiberContext>
}
