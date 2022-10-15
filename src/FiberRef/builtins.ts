import { identity } from 'hkt-ts'
import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberRef, make } from './FiberRef.js'

import { Empty } from '@/Env/Env.js'
import * as Fx from '@/Fx/Fx.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { LogAnnotation } from '@/Logger/LogAnnotation.js'
import { LogSpan } from '@/Logger/LogSpan.js'
import { Semaphore } from '@/Semaphore/Semaphore.js'
import { Trace } from '@/Trace/Trace.js'

export const CurrentEnv = make(
  Fx.fromLazy(() => Empty),
  {
    join: identity,
  },
)

export const CurrentConcurrencyLevel = make(
  Fx.fromLazy(() => Semaphore(Fx.unit, NonNegativeInteger(Infinity))),
  {
    join: identity, // Always keep the parent Fiber's concurrency level
  },
)

export const CurrentInterruptStatus = make(Fx.now(true), {
  join: identity, // Always keep the parent Fiber's interrupt status
})

export const CurrentTrace = make(
  Fx.fromLazy<Trace>(() => Trace.runtime(new Error())),
  {
    join: identity, // Always keep the parent Fiber's trace
  },
)

export const CurrentLogSpans = FiberRef.make(
  Fx.fromLazy(() => ImmutableMap<string, LogSpan>()),
  {
    join: identity,
  },
)

export const CurrentLogAnnotations = FiberRef.make(
  Fx.fromLazy(() => ImmutableMap<string, LogAnnotation>()),
  {
    join: identity,
  },
)
