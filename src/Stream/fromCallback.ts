import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { Exit, isFailure } from '@effect/core/io/Exit'
import { flow, pipe } from '@fp-ts/data/Function'

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
): Stream<R, E, A> {
  return Stream<R, E, A, E1>(<R3, E3, B>(sink: Sink<E, A, R3, E3, B>) =>
    pipe(
      Effect.runtime<R | R3>(),
      Effect.flatMap((runtime) =>
        Effect.asyncEffect<R | R3, E3, B, R, E1, unknown>((cb) =>
          f({
            event: (a) =>
              runtime.unsafeRunAsyncWith(sink.event(a), (exit) =>
                isFailure(exit) ? cb(Effect.failCause(exit.cause)) : undefined,
              ),
            error: (c) => runtime.unsafeRunAsyncWith(sink.error(c), flow(fromExit, cb)),
            end: () => runtime.unsafeRunAsyncWith(sink.end, flow(fromExit, cb)),
          }),
        ),
      ),
      Effect.fork,
    ),
  )
}
