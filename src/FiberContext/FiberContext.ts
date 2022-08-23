import { FiberRefs } from '@/FiberRefs/FiberRefs.js'
import { Platform } from '@/Platform/Platform.js'
import { Closeable } from '@/Scope/Closeable.js'

export interface FiberContext {
  readonly platform: Platform
  readonly fiberRefs: FiberRefs
  readonly scope: Closeable
}
