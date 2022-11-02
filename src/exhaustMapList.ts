import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import { pipe } from '@fp-ts/data/Function'
import * as HashSet from '@tsplus/stdlib/collections/HashSet'
import * as ImmutableMap from '@tsplus/stdlib/collections/ImmutableMap'
import { AtomicReference } from '@tsplus/stdlib/data/AtomicReference'
import { identity } from '@tsplus/stdlib/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function exhaustMapList<A, R2, E2, B, A1 = A>(
  f: (a: A) => Fx<R2, E2, B>,
  selector: (a: A) => A1 = identity as any,
) {
  return <R, E>(fx: Fx<R, E, ReadonlyArray<A>>): Fx<R | R2, E | E2, ReadonlyArray<B>> =>
    Fx((emitter) =>
      pipe(
        Effect.sync(() => new AtomicReference(ImmutableMap.empty<A1, Fiber.Fiber<E2, unknown>>())),
        Effect.zip(Effect.sync(() => new AtomicReference<ReadonlyArray<A>>([]))), // Must use Array to maintain order
        Effect.zip(Effect.sync(() => new AtomicReference(ImmutableMap.empty<A1, B>()))),
        Effect.flatMap(([[fibersMapRef, previousValuesRef], valuesRef]) => {
          const emitIfReady = pipe(
            Effect.sync(() => previousValuesRef.get),
            Effect.zip(Effect.sync(() => valuesRef.get)),
            Effect.flatMap(([previousValues, values]) => {
              const vals = previousValues
                .map((a) => pipe(values, ImmutableMap.get(selector(a))))
                .filter(Maybe.isSome)
                .map((x) => x.value)

              if (vals.length === previousValues.length) {
                return emitter.emit(vals)
              }

              return Effect.unit
            }),
          )

          return withDynamicCountdownLatch(
            1,
            ({ latch, increment }) =>
              pipe(
                fx.run(
                  Emitter(
                    (as) =>
                      Effect.suspendSucceed(() => {
                        const fibersMap = fibersMapRef.get
                        const previous = HashSet.make<readonly A[]>(...previousValuesRef.get)
                        const current = HashSet.make<readonly A[]>(...as)
                        const toStart = HashSet.difference(previous)(current)
                        const toCancel = HashSet.difference(current)(previous)

                        previousValuesRef.set(as)

                        // If the input values were just reordered, go ahead and emit
                        if (HashSet.size(toStart) === 0 && HashSet.size(toCancel) === 0) {
                          return emitIfReady
                        }

                        return pipe(
                          Effect.forEachParDiscard(toCancel, (a) =>
                            pipe(
                              fibersMap,
                              ImmutableMap.get(selector(a)),
                              Maybe.fold(
                                () => Effect.unit,
                                (fiber) =>
                                  pipe(
                                    Fiber.interrupt(fiber),
                                    Effect.zipRight(
                                      Effect.sync(() => {
                                        const a1 = selector(a)
                                        fibersMapRef.set(ImmutableMap.remove(a1)(fibersMapRef.get))
                                        valuesRef.set(ImmutableMap.remove(a1)(valuesRef.get))
                                      }),
                                    ),
                                    Effect.zipRight(latch.countDown),
                                  ),
                              ),
                            ),
                          ),
                          Effect.zipParRight(
                            Effect.forEachDiscard(toStart, (a) =>
                              pipe(
                                increment,
                                Effect.flatMap(() =>
                                  Effect.forkScoped(
                                    f(a).run(
                                      Emitter(
                                        (b) =>
                                          pipe(
                                            Effect.sync(() =>
                                              valuesRef.set(
                                                ImmutableMap.set(selector(a), b)(valuesRef.get),
                                              ),
                                            ),
                                            Effect.zipRight(emitIfReady),
                                          ),
                                        emitter.failCause,
                                        pipe(
                                          Effect.sync(() =>
                                            fibersMapRef.set(
                                              ImmutableMap.remove(selector(a))(fibersMapRef.get),
                                            ),
                                          ),
                                          Effect.zipRight(latch.countDown),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                Effect.tap((fiber) =>
                                  Effect.sync(() =>
                                    fibersMapRef.set(
                                      pipe(
                                        fibersMapRef.get,
                                        ImmutableMap.set<A1, Fiber.Fiber<E2, unknown>>(
                                          selector(a),
                                          fiber,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Effect.forkScoped,
                        )
                      }),
                    emitter.failCause,
                    latch.countDown,
                  ),
                ),
              ),
            emitter.end,
          )
        }),
      ),
    )
}
