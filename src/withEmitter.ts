import { Deferred, Effect, Exit, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import type { UnsafeEmitter } from './Subject.js'

export function withEmitter<R, E, A>(
  f: (emitter: UnsafeEmitter<E, A>) => Effect.Effect<R, never, void>,
): Fx<R, E, A> {
  return Fx<R, E, A>(<R2>(sink: Emitter<R2, E, A>) =>
    Effect.gen(function* ($) {
      const runtime = yield* $(Effect.runtime<R | R2>())
      const deferred = yield* $(Deferred.make<never, unknown>())

      let canceler: Effect.Effect<R, never, void> = Effect.unit()

      yield* $(Effect.addFinalizer(() => canceler))

      canceler = f({
        unsafeEmit: (a) =>
          runtime.unsafeRunAsyncWith(sink.emit(a), (exit) =>
            Exit.isFailure(exit) ? pipe(deferred, Deferred.failCause(exit.cause)) : undefined,
          ),
        unsafeFailCause: (e) =>
          runtime.unsafeRunAsyncWith(sink.failCause(e), (exit) =>
            pipe(exit, Deferred.done)(deferred),
          ),
        unsafeEnd: () =>
          runtime.unsafeRunAsyncWith(sink.end, (exit) => pipe(exit, Deferred.unsafeDone)(deferred)),
      })

      yield* $(Effect.onInterrupt(() => canceler)(Deferred.await(deferred)))
    }),
  )
}
