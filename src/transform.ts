import * as TSemaphore from '@effect/stm/TSemaphore'
import { Clock, Effect, Scope, pipe } from 'effect'
import { RuntimeFlagsPatch } from 'effect/Fiber'

import { Fx } from './Fx.js'

export function transform<R2 = never>(
  f: <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E, A>,
) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R | R2, E, A> => Fx((emitter) => f(fx.run(emitter)))
}

export function withParallelism(parallelism: number) {
  return transform(Effect.withParallelism(parallelism))
}

export const withParallelismUnbounded = transform(Effect.withParallelismUnbounded)

export const withRuntimeFlags = (updated: RuntimeFlagsPatch.RuntimeFlagsPatch) =>
  transform(Effect.withRuntimeFlags(updated))

export const scoped = transform(Effect.scoped) as <R, E, A>(
  fx: Fx<R, E, A>,
) => Fx<Exclude<R, Scope.Scope>, E, A>

export const withClock = (clock: Clock.Clock) => transform(Effect.withClock(clock))

export const uninterruptible = transform(Effect.uninterruptible)
export const interruptible = transform(Effect.interruptible)

export const withPermit = (
  self: TSemaphore.TSemaphore,
): (<R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>) =>
  transform(
    <R, E, A>(eff: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
      pipe(eff, TSemaphore.withPermit(self) as any),
  )

export const withPermits = (permits: number) => (self: TSemaphore.TSemaphore) =>
  transform(TSemaphore.withPermits(permits)(self) as any)
