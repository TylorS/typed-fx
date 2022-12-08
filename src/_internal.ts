import { Cause, Deferred, Effect, Ref, pipe } from 'effect'

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
      Effect.foldCauseEffect<E, A, R | R2, E | E2, A | B, R | R2, E | E2, A | B>((e) => {
        const defects = Cause.defects(e)

        for (const defect of defects) {
          if (isEarlyExitFailure(defect)) {
            return handler
          }
        }

        return Effect.failCause(e)
      }, Effect.succeed),
    )

/**
 * A small wrapper around CountdownLatch which enables incrementing
 * the latch count dynamically
 */
export type DynamicCountdownLatch = {
  readonly increment: Effect.Effect<never, never, void>
  readonly decrement: Effect.Effect<never, never, void>
  readonly await: Effect.Effect<never, never, void>
}

export function makeDynamicCountdownLatch(
  initialCount: number,
): Effect.Effect<never, never, DynamicCountdownLatch> {
  return pipe(
    Ref.make<number>(initialCount),
    Effect.zipWith(Deferred.make<never, void>(), (ref, deferred) => ({
      increment: pipe(
        ref,
        Ref.update((x) => x + 1),
      ),
      decrement: pipe(
        ref,
        Ref.updateAndGet((x) => Math.max(0, x - 1)),
        Effect.tap((x) => (x === 0 ? Deferred.succeed<void>(undefined)(deferred) : Effect.unit())),
      ),
      await: Deferred.await(deferred),
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
    Effect.flatMap((latch) => pipe(latch.await, Effect.zipRight(onEnd))),
  )
}
