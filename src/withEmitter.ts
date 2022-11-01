import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import { unsafeForkUnstarted } from '@effect/core/io/Fiber/_internal/runtime'
import { Scope } from '@effect/core/io/Scope'
import { flow, pipe } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'
import type { UnsafeEmitter } from './Subject.js'

export function withEmitter<R, E, A>(
  f: (emitter: UnsafeEmitter<E, A>) => Effect.Canceler<R>,
): Fx<R, E, A> {
  return Fx<R, E, A>(<R2>(sink: Emitter<R2, E, A>) => {
    return Effect.withFiberRuntime<R | R2 | Scope, never, unknown>((fiber, status) => {
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
          Effect.asyncEffect<R | R2, never, unknown, R | R2, never, any>((cb) => {
            canceler = f({
              unsafeEmit: (a) =>
                unsafeRun(sink.emit(a), (exit) =>
                  Exit.isFailure(exit) ? cb(Effect.failCause(exit.cause)) : undefined,
                ),
              unsafeFailCause: (e) => unsafeRun(sink.failCause(e), flow(Effect.done, cb)),
              unsafeEnd: () => unsafeRun(sink.end, flow(Effect.done, cb)),
            })

            return canceler
          }),
        ),
      )
    })
  })
}
