import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

import * as FiberId from '@/FiberId/FiberId.js'
import { FiberRefs } from '@/FiberRefs/FiberRefs.js'
import { Console } from '@/Logger/Console.js'
import { Logger } from '@/Logger/Logger.js'
import { Platform } from '@/Platform/Platform.js'
import { Closeable } from '@/Scope/Closeable.js'
import { LocalScope } from '@/Scope/LocalScope.js'
import { None, Supervisor } from '@/Supervisor/Supervisor.js'

export interface FiberContext<Id extends FiberId.FiberId = FiberId.FiberId> {
  readonly id: Id
  readonly platform: Platform
  readonly fiberRefs: FiberRefs
  readonly scope: Closeable
  readonly supervisor: Supervisor<any>
  readonly logger: Logger<string, any>
  readonly parent: Maybe<FiberContext>

  readonly fork: <Id2 extends FiberId.FiberId = FiberId.Live>(
    overrides?: Partial<FiberContext<Id2>>,
  ) => FiberContext<Id2>
}

export function FiberContext<Id extends FiberId.FiberId = FiberId.Live>(
  params: Partial<Omit<FiberContext<Id>, 'fork'>> = {},
): FiberContext<Id> {
  const {
    platform = Platform(),
    id = FiberId.Live(platform) as Id,
    fiberRefs = FiberRefs(),
    scope = new LocalScope(),
    supervisor = None,
    logger = Console,
    parent = Nothing,
  } = params

  const context: FiberContext<Id> = {
    id,
    platform,
    fiberRefs,
    scope,
    supervisor,
    logger,
    parent,
    fork: ((overrides?: Partial<FiberContext>) =>
      fork(context, overrides)) as FiberContext<Id>['fork'],
  }

  return context
}

export function fork<Id extends FiberId.FiberId = FiberId.Live, Id2 extends FiberId.FiberId = Id>(
  context: FiberContext<Id>,
  overrides?: Partial<Omit<FiberContext<Id2>, 'fork'>>,
): FiberContext<Id2> {
  return FiberContext({
    id: (overrides?.id ?? FiberId.Live(context.platform)) as Id2,
    platform: overrides?.platform ?? context.platform.fork(),
    fiberRefs: overrides?.fiberRefs ?? context.fiberRefs.fork(),
    scope: overrides?.scope ?? context.scope.fork(),
    supervisor: overrides?.supervisor ?? None,
    logger: overrides?.logger ?? context.logger,
    parent: overrides?.parent ?? Just(context),
  })
}
