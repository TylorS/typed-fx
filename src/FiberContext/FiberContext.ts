import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

import * as FiberId from '@/FiberId/FiberId.js'
import { FiberRefs } from '@/FiberRefs/FiberRefs.js'
import { SequentialStrategy } from '@/Finalizer/Finalizer.js'
import { Platform } from '@/Platform/Platform.js'
import { Closeable } from '@/Scope/Closeable.js'
import { LocalScope } from '@/Scope/LocalScope.js'

export interface FiberContext {
  readonly id: FiberId.Live
  readonly platform: Platform
  readonly fiberRefs: FiberRefs
  readonly scope: Closeable
  readonly parent: Maybe<FiberContext>

  readonly fork: (overrides?: Partial<FiberContext>) => FiberContext
}

export function FiberContext(params: Partial<Omit<FiberContext, 'fork'>> = {}): FiberContext {
  const {
    platform = Platform(),
    id = FiberId.Live(platform),
    fiberRefs = FiberRefs(),
    scope = new LocalScope(SequentialStrategy),
    parent = Nothing,
  } = params

  const context: FiberContext = {
    id,
    platform,
    fiberRefs,
    scope,
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
    parent: overrides?.parent ?? Just(context),
  })
}
