import type { EffectRuntime } from './EffectRuntime.js'
import type { ControlFrame, Op } from './Op.js'

import type { Cause } from '@/Cause/Cause.js'
import type { Exit } from '@/Exit/Exit.js'

export interface EffectSupervisor {
  readonly onStart?: (runtime: EffectRuntime<any, any, any>) => void
  readonly onRunning?: (runtime: EffectRuntime<any, any, any>) => void
  readonly onOp?: (runtime: EffectRuntime<any, any, any>, op: Op) => void
  readonly onValue?: (
    runtime: EffectRuntime<any, any, any>,
    op: Op,
    value: any,
    controlFrame: ControlFrame | undefined,
  ) => void
  readonly onCause?: (
    runtime: EffectRuntime<any, any, any>,
    op: Op,
    cause: Cause<any>,
    controlFrame: ControlFrame | undefined,
  ) => void
  readonly onSuspended?: (runtime: EffectRuntime<any, any, any>) => void
  readonly onDone?: (runtime: EffectRuntime<any, any, any>, exit: Exit<any, any>) => void
}
