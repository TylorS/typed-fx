import { Clock } from '@effect/core/io/Clock'
import * as Effect from '@effect/core/io/Effect'
import { Exit } from '@effect/core/io/Exit'
import { RuntimeFlagsPatch } from '@effect/core/io/RuntimeFlags/patch'
import { Scope } from '@effect/core/io/Scope'

import { Fx } from './Fx.js'

export function transform<R2 = never, E2 = never>(
  f: <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
) {
  return <R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E, A, E1 | E2> =>
    Fx((sink) => f(fx.run(sink)))
}

export function withParallelism(parallelism: number) {
  return transform(Effect.withParallelism(parallelism))
}

export const withParallelismUnbounded = transform(Effect.withParallelismUnbounded)

export const withFinalizer = <R2, X>(finalizer: Effect.Effect<R2, never, X>) =>
  transform<R2 | Scope, never>(Effect.withFinalizer(finalizer))

export const withFinalizerExit = <R2, X>(
  finalizer: <E, A>(exit: Exit<E, A>) => Effect.Effect<R2, never, X>,
) => transform<R2 | Scope, never>(Effect.withFinalizerExit(finalizer))

export const withRuntimeFlags = (updated: RuntimeFlagsPatch) =>
  transform(Effect.withRuntimeFlags(updated))

export const scoped = transform(Effect.scoped)

export const withClock = (clock: Clock) => transform(Effect.withClock(clock))
