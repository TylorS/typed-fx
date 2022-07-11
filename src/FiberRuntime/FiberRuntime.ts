// TODO: Observers
// TODO: MutableQueue
// TODO: StrackTraces

import { Environment } from '@/Environment/Environment'
import { FiberRefs } from '@/FiberRefs/FiberRefs'
import { Service } from '@/Service/Service'
import { Stack } from '@/Stack/index'

// Track Environmet
// Track Status
// Track Children/Parent
// Supervisor
// Logging
// Metrics
// Tracing
// Layers
// FiberRefs
// Streams
export class FiberRuntime<R extends Service<any>, E, A> {
  protected environment: Stack<Environment<any>>

  constructor(readonly params: FiberRuntimeParams<R>) {
    this.environment = new Stack(params.environment)
  }
}

export interface FiberRuntimeParams<R extends Service<any>> {
  readonly environment: Environment<R>
  readonly fiberRefs: FiberRefs
}
