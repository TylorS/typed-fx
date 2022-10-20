import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { Exit, isFailure } from '@effect/core/io/Exit'
import { unsafeForkUnstarted } from '@effect/core/io/Fiber/_internal/runtime'
import { flow } from '@fp-ts/data/Function'
import { Fiber } from 'node_modules/@effect/core/io/Fiber.js'

import { Stream } from './Stream.js'

import { Sink } from '@/Sink/Sink.js'

const fromExit = <E, A>(exit: Exit<E, A>) =>
  isFailure(exit) ? Effect.failCause(exit.cause) : Effect.succeed(exit.value)

export function fromCallback<R, E, A, E1 = never>(
  f: (sink: {
    readonly event: (a: A) => void
    readonly error: (cause: Cause<E>) => void
    readonly end: () => void
  }) => Effect.Effect<R, E1, unknown>,
): Stream<R, E, A, E1> {
  return Stream<R, E, A, E1>(
    <R3, E3, B>(sink: Sink<E, A, R3, E3, B>): Effect.Effect<R | R3, never, Fiber<E1 | E3, B>> =>
      Effect.fork(
        Effect.withFiberRuntime<R | R3, E1 | E3, B>((fiber, status) =>
          Effect.asyncEffect<R | R3, E3, B, R, E1, unknown>((cb) => {
            const unsafeRun = <E2, A2>(
              effect: Effect.Effect<R | R3, E2, A2>,
              onExit: (exit: Exit<E2, A2>) => void,
            ) => {
              const f = unsafeForkUnstarted(effect, fiber, status.runtimeFlags)
              f.addObserver(onExit)
              f.start(effect)
            }

            return f({
              event: (a) =>
                unsafeRun(sink.event(a), (exit) =>
                  isFailure(exit) ? cb(Effect.failCause(exit.cause)) : undefined,
                ),
              error: (c) => unsafeRun(sink.error(c), flow(fromExit, cb)),
              end: () => unsafeRun(sink.end, flow(fromExit, cb)),
            })
          }),
        ),
      ),
  )
}
