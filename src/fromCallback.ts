import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import { unsafeForkUnstarted } from '@effect/core/io/Fiber/_internal/runtime'
import { pipe } from '@fp-ts/data/Function'
import { flow } from 'node_modules/@fp-ts/data/Function.js'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'

const fromExit = <E, A>(exit: Exit.Exit<E, A>) =>
  pipe(exit, Exit.fold<E, A, Effect.Effect<never, E, A>>(Effect.failCause, Effect.succeed))

export function make<R, E, A>(
  f: (sink: {
    readonly event: (a: A) => void
    readonly error: (cause: Cause<E>) => void
    readonly end: () => void
  }) => Effect.Canceler<R>,
): Stream<R, E, A> {
  return Stream<R, E, A>(<R2, E2, B>(sink: Sink<E, A, R2, E2, B>) =>
    Effect.withFiberRuntime<R | R2, E2, B>((fiber, status) => {
      const unsafeRun = <R, E, A>(
        eff: Effect.Effect<R, E, A>,
        observer: (exit: Exit.Exit<E, A>) => void,
      ) => {
        const f = unsafeForkUnstarted(eff, fiber, status.runtimeFlags)
        f.addObserver(observer)
        f.start(eff)
      }

      return Effect.asyncEffect((cb) =>
        f({
          event: (a) =>
            unsafeRun(sink.event(a), (exit) =>
              Exit.isFailure(exit) ? cb(Effect.failCause(exit.cause)) : undefined,
            ),
          error: (e) => unsafeRun(sink.error(e), flow(fromExit, cb)),
          end: () => unsafeRun(sink.end, flow(fromExit, cb)),
        }),
      )
    }),
  )
}
