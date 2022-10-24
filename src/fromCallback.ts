import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import { unsafeForkUnstarted } from '@effect/core/io/Fiber/_internal/runtime'
import { Scope } from '@effect/core/io/Scope'
import { flow, pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export function fromCallback<R, E, A>(
  f: (sink: {
    readonly event: (a: A) => void
    readonly error: (cause: Cause<E>) => void
    readonly end: () => void
  }) => Effect.Canceler<R>,
): Fx<R, E, A> {
  return Fx<R, E, A>(<R2, E2, B>(sink: Sink<E, A, R2, E2, B>) => {
    return Effect.scoped(
      Effect.withFiberRuntime<R | R2 | Scope, E2, B>((fiber, status) => {
        const unsafeRun = <R, E, A>(
          eff: Effect.Effect<R, E, A>,
          observer: (exit: Exit.Exit<E, A>) => void,
        ) => {
          const f = unsafeForkUnstarted(eff, fiber, status.runtimeFlags)
          f.addObserver(observer)
          f.start(eff)
        }

        let canceler: Effect.Canceler<R> = Effect.unit

        return pipe(
          Effect.addFinalizer(Effect.suspendSucceed(() => canceler)),
          Effect.zipRight(
            Effect.asyncEffect<R | R2, E2, B, R | R2, never, any>((cb) => {
              canceler = f({
                event: (a) =>
                  unsafeRun(sink.event(a), (exit) =>
                    Exit.isFailure(exit) ? cb(Effect.failCause(exit.cause)) : undefined,
                  ),
                error: (e) => unsafeRun(sink.error(e), flow(Effect.done, cb)),
                end: () => unsafeRun(sink.end, flow(Effect.done, cb)),
              })

              return canceler
            }),
          ),
        )
      }),
    )
  })
}
