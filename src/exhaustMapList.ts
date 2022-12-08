import { Effect, Fiber, HashMap, HashSet, MutableRef, Option, identity, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function exhaustMapList<A, R2, E2, B, A1 = A>(
  f: (a: A) => Fx<R2, E2, B>,
  selector: (a: A) => A1 = identity as any,
) {
  return <R, E>(fx: Fx<R, E, ReadonlyArray<A>>): Fx<R | R2, E | E2, ReadonlyArray<B>> =>
    Fx((emitter) =>
      pipe(
        Effect.sync(() => MutableRef.make(HashMap.empty<A1, Fiber.Fiber<E2, unknown>>())),
        Effect.zip(Effect.sync(() => MutableRef.make<ReadonlyArray<A>>([]))), // Must use Array to maintain order
        Effect.zip(Effect.sync(() => MutableRef.make(HashMap.empty<A1, B>()))),
        Effect.flatMap(([[fibersMapRef, previousValuesRef], valuesRef]) => {
          const emitIfReady = pipe(
            Effect.sync(() => MutableRef.get(previousValuesRef)),
            Effect.zip(Effect.sync(() => MutableRef.get(valuesRef))),
            Effect.flatMap(([previousValues, values]) => {
              const vals = previousValues
                .map((a) => pipe(values, HashMap.get(selector(a))))
                .filter(Option.isSome)
                .map((x) => x.value)

              if (vals.length === previousValues.length) {
                return emitter.emit(vals)
              }

              return Effect.unit()
            }),
          )

          return withDynamicCountdownLatch(
            1,
            (latch) =>
              pipe(
                fx.run(
                  Emitter(
                    (as) =>
                      Effect.suspendSucceed(() => {
                        const fibersMap = MutableRef.get(fibersMapRef)
                        const previous = HashSet.make<readonly A[]>(
                          ...MutableRef.get(previousValuesRef),
                        )
                        const current = HashSet.make<readonly A[]>(...as)
                        const toStart = HashSet.difference(previous)(current)
                        const toCancel = HashSet.difference(current)(previous)

                        pipe(previousValuesRef, MutableRef.set(as))

                        // If the input values were just reordered, go ahead and emit
                        if (HashSet.size(toStart) === 0 && HashSet.size(toCancel) === 0) {
                          return emitIfReady
                        }

                        return pipe(
                          toCancel,
                          Effect.forEachParDiscard((a) =>
                            pipe(
                              fibersMap,
                              HashMap.get(selector(a)),
                              Option.match(Effect.unit, (fiber) =>
                                pipe(
                                  Fiber.interrupt(fiber),
                                  Effect.zipRight(
                                    Effect.sync(() => {
                                      const a1 = selector(a)
                                      pipe(
                                        fibersMapRef,
                                        MutableRef.set(
                                          HashMap.remove(a1)(MutableRef.get(fibersMapRef)),
                                        ),
                                      )
                                      pipe(
                                        valuesRef,
                                        MutableRef.set(
                                          HashMap.remove(a1)(MutableRef.get(valuesRef)),
                                        ),
                                      )
                                    }),
                                  ),
                                  Effect.zipRight(latch.decrement),
                                ),
                              ),
                            ),
                          ),
                          Effect.zipParRight(
                            pipe(
                              toStart,
                              Effect.forEachDiscard((a) =>
                                pipe(
                                  latch.increment,
                                  Effect.flatMap(() =>
                                    Effect.forkScoped(
                                      f(a).run(
                                        Emitter(
                                          (b) =>
                                            pipe(
                                              Effect.sync(() =>
                                                pipe(
                                                  valuesRef,
                                                  MutableRef.set(
                                                    HashMap.set(
                                                      selector(a),
                                                      b,
                                                    )(MutableRef.get(valuesRef)),
                                                  ),
                                                ),
                                              ),
                                              Effect.zipRight(emitIfReady),
                                            ),
                                          emitter.failCause,
                                          pipe(
                                            Effect.sync(() =>
                                              pipe(
                                                fibersMapRef,
                                                MutableRef.set(
                                                  HashMap.remove(selector(a))(
                                                    MutableRef.get(fibersMapRef),
                                                  ),
                                                ),
                                              ),
                                            ),
                                            Effect.zipRight(latch.decrement),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  Effect.tap((fiber) =>
                                    Effect.sync(() =>
                                      pipe(
                                        fibersMapRef,
                                        MutableRef.set(
                                          pipe(
                                            fibersMapRef,
                                            MutableRef.get,
                                            HashMap.set<A1, Fiber.Fiber<E2, unknown>>(
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
                              Effect.zipRight(emitIfReady),
                            ),
                          ),
                        )
                      }),
                    emitter.failCause,
                    latch.decrement,
                  ),
                ),
              ),
            emitter.end,
          )
        }),
      ),
    )
}
