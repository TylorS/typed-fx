import {
  CountdownLatch,
  CountdownLatchInternal,
} from '@effect/core/concurrent/CountdownLatch/definition'
import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'

/**
 * A small wrapper around CountdownLatch which enables incrementing
 * the latch count dynamically
 */
export type DynamicCountdownLatch = {
  readonly increment: Effect.Effect<never, never, void>
  readonly latch: CountdownLatch
}

export function makeDynamicCountdownLatch(
  initialCount: number,
): Effect.Effect<never, never, DynamicCountdownLatch> {
  return pipe(
    Ref.makeRef<number>(() => initialCount),
    Effect.zipWith(Deferred.make<never, void>(), (ref, deferred) => ({
      increment: ref.update((x) => x + 1),
      latch: new CountdownLatchInternal(ref, deferred),
    })),
  )
}

export function withDynamicCountdownLatch<R, E, A, R2, E2, B>(
  initialCount: number,
  f: (latch: DynamicCountdownLatch) => Effect.Effect<R, E, A>,
  onEnd: Effect.Effect<R2, E2, B>,
): Effect.Effect<R | R2, E | E2, B> {
  return pipe(
    makeDynamicCountdownLatch(initialCount),
    Effect.tap(f),
    Effect.flatMap(({ latch }) => pipe(latch.await, Effect.zipRight(onEnd))),
  )
}
