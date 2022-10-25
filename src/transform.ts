import { Clock } from '@effect/core/io/Clock'
import * as Effect from '@effect/core/io/Effect'
import { Exit } from '@effect/core/io/Exit'
import { RuntimeFlagsPatch } from '@effect/core/io/RuntimeFlags/patch'
import { Scope } from '@effect/core/io/Scope'
import * as TSemaphore from '@effect/core/stm/TSemaphore'

import { Push } from './Push.js'

export function transform<R2 = never>(
  f: <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E, A>,
) {
  return <R, E, A>(push: Push<R, E, A>): Push<R | R2, E, A> =>
    Push((emitter) => f(push.run(emitter)))
}

export function withParallelism(parallelism: number) {
  return transform(Effect.withParallelism(parallelism))
}

export const withParallelismUnbounded = transform(Effect.withParallelismUnbounded)

export const withFinalizer = <R2, X>(finalizer: Effect.Effect<R2, never, X>) =>
  transform<R2 | Scope>(Effect.withFinalizer(finalizer))

export const withFinalizerExit = <R2, X>(
  finalizer: <E, A>(exit: Exit<E, A>) => Effect.Effect<R2, never, X>,
) => transform<R2 | Scope>(Effect.withFinalizerExit(finalizer))

export const withRuntimeFlags = (updated: RuntimeFlagsPatch) =>
  transform(Effect.withRuntimeFlags(updated))

export const scoped = transform(Effect.scoped)

export const withClock = (clock: Clock) => transform(Effect.withClock(clock))

export const uninterruptible = transform(Effect.uninterruptible)
export const interruptible = transform(Effect.interruptible)

export const withPermit = (self: TSemaphore.TSemaphore) => transform(TSemaphore.withPermit(self))

export const withPermits = (permits: number) => (self: TSemaphore.TSemaphore) =>
  transform(TSemaphore.withPermits(permits)(self))
