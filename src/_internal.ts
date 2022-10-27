import {
  CountdownLatch,
  CountdownLatchInternal,
} from '@effect/core/concurrent/CountdownLatch/definition'
import * as Cause from '@effect/core/io/Cause'
import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

export const EARLY_EXIT_FAILURE = Symbol('EarlyExitFailure')
export interface EarlyExitFailure {
  readonly sym: typeof EARLY_EXIT_FAILURE
}
export const EarlyExitFailure: EarlyExitFailure = { sym: EARLY_EXIT_FAILURE }

export function isEarlyExitFailure(u: unknown): u is EarlyExitFailure {
  return typeof u === 'object' && u !== null && (u as any).sym === EARLY_EXIT_FAILURE
}

export const exitEarly = Effect.die(EarlyExitFailure)

export const onEarlyExitFailure =
  <R2, E2, B>(handler: Effect.Effect<R2, E2, B>) =>
  <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | B> =>
    pipe(
      effect,
      Effect.foldCauseEffect<E, A, R | R2, E | E2, A | B, R | R2, E | E2, A | B>(
        (e) =>
          pipe(
            e,
            Cause.dieMaybe,
            Maybe.fold(
              () => Effect.failCause(e),
              (d) => {
                console.log('exitEarly', d)

                return isEarlyExitFailure(d) ? handler : Effect.failCause(e)
              },
            ),
          ),
        Effect.succeed,
      ),
    )

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
