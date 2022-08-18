import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Renderer, defaultRenderer } from '@/Cause/Renderer.js'
import { FiberRefs } from '@/FiberRefs/FiberRefs.js'
import { Platform } from '@/Platform/Platform.js'
import type { Scheduler } from '@/Scheduler/Scheduler.js'
import { Supervisor, and } from '@/Supervisor/index.js'

export class FiberContext {
  constructor(
    readonly platform: Platform,
    readonly scheduler: Scheduler,
    readonly supervisor: Supervisor<any>,
    readonly fiberRefs: FiberRefs = FiberRefs(),
    readonly concurrencyLevel: NonNegativeInteger = NonNegativeInteger(Infinity),
    readonly interruptStatus: boolean = true,
    readonly renderer: Renderer<any> = defaultRenderer,
    readonly parent: Maybe<FiberContext> = Nothing,
  ) {}
}

export namespace FiberContext {
  export function fork(context: FiberContext, overrides?: Partial<FiberContext>): FiberContext {
    return {
      ...context,
      ...overrides,
      supervisor: overrides?.supervisor
        ? and(overrides.supervisor)(context.supervisor)
        : context.supervisor,
      platform: overrides?.platform ?? context.platform.fork(),
      fiberRefs: overrides?.fiberRefs ?? context.fiberRefs.fork(),
      parent: overrides?.parent ?? Just(context),
    }
  }
}

export const fork = FiberContext.fork
