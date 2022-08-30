import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

import * as FiberId from '@/FiberId/FiberId.js'
import { FiberRefs } from '@/FiberRefs/FiberRefs.js'
import { SequentialStrategy } from '@/Finalizer/Finalizer.js'
import { Console } from '@/Logger/Console.js'
import { Logger } from '@/Logger/Logger.js'
import { Platform } from '@/Platform/Platform.js'
import { Closeable } from '@/Scope/Closeable.js'
import { LocalScope } from '@/Scope/LocalScope.js'
import { None, Supervisor } from '@/Supervisor/Supervisor.js'

export interface FiberContext {
  readonly id: FiberId.Live
  readonly platform: Platform
  readonly fiberRefs: FiberRefs
  readonly scope: Closeable
  readonly supervisor: Supervisor<any>
  readonly logger: Logger<string, any>
  readonly parent: Maybe<FiberContext>

  readonly fork: (overrides?: Partial<FiberContext>) => FiberContext
}

export function FiberContext(params: Partial<Omit<FiberContext, 'fork'>> = {}): FiberContext {
  const {
    platform = Platform(),
    id = FiberId.Live(platform),
    fiberRefs = FiberRefs(),
    scope = new LocalScope(SequentialStrategy),
    supervisor = None,
    logger = Console,
    parent = Nothing,
  } = params

  const context: FiberContext = {
    id,
    platform,
    fiberRefs,
    scope,
    supervisor,
    logger,
    parent,
    fork: (overrides?: Partial<FiberContext>) => fork(context, overrides),
  }

  return context
}

export function fork(
  context: FiberContext,
  overrides?: Partial<Omit<FiberContext, 'fork'>>,
): FiberContext {
  return FiberContext({
    id: overrides?.id ?? FiberId.Live(context.platform),
    platform: overrides?.platform ?? context.platform.fork(),
    fiberRefs: overrides?.fiberRefs ?? context.fiberRefs.fork(),
    scope: overrides?.scope ?? context.scope.fork(),
    supervisor: overrides?.supervisor ?? None,
    logger: overrides?.logger ?? context.logger,
    parent: overrides?.parent ?? Just(context),
  })
}
