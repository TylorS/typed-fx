import type { Effect } from './Effect.js'

import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Platform } from '@/Platform/index.js'
import { StackTrace } from '@/Trace/Trace.js'

export interface EffectContext<Fx extends Effect.AnyIO> {
  readonly handlers: Effect.HandlerMap<Fx> // = ImmutableMap()
  readonly platform: Platform // = Platform()
  readonly stackTrace: StackTrace // = Trace.StackTrace()
  readonly interruptStatus: boolean // = true
}

export function EffectContext<Fx extends Effect.AnyIO = never>(
  handlers: Effect.HandlerMap<Fx> = ImmutableMap(),
  platform: Platform = Platform(),
  stackTrace: StackTrace = StackTrace(),
  interruptStatus = true,
): EffectContext<Fx> {
  return {
    handlers,
    platform,
    stackTrace,
    interruptStatus,
  }
}
