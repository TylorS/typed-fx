import type { Effect } from './Effect.js'
import type { EffectContext } from './EffectContext.js'

import type { Exit } from '@/Exit/Exit.js'
import type { FiberId } from '@/FiberId/FiberId.js'
import type { FiberStatus } from '@/FiberStatus/index.js'
import type { Trace } from '@/Trace/Trace.js'

export interface Fiber<E, A> {
  readonly tag: 'Live'
  readonly id: FiberId.Live
  readonly status: FiberStatus<E, A>
  readonly context: EffectContext
  readonly exit: Effect.Of<Exit<E, A>>
  readonly trace: Effect.Of<Trace>
  readonly interruptAs: (id: FiberId) => Effect.Of<Exit<E, A>>
}
