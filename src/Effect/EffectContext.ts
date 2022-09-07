import { Maybe, Nothing } from 'hkt-ts/Maybe'

import { EffectRefs } from './EffectRefs.js'

import { Platform } from '@/Platform/index.js'
import { StackTrace } from '@/Trace/Trace.js'

export interface EffectContext {
  readonly platform: Platform
  readonly refs: EffectRefs
  readonly stackTrace: StackTrace
  readonly interruptStatus: boolean
  readonly parent: Maybe<EffectContext>
}

export function EffectContext(
  platform: Platform = Platform(),
  refs: EffectRefs = EffectRefs(),
  stackTrace: StackTrace = StackTrace(),
  interruptStatus = true,
  parent: Maybe<EffectContext> = Nothing,
): EffectContext {
  return {
    platform,
    refs,
    stackTrace,
    interruptStatus,
    parent,
  }
}
