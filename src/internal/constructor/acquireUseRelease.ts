import { dualWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Exit } from "@effect/io/Exit"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const acquireUseRelease: {
  <R, E, A, R2, E2, B, R3, C>(
    acquire: Effect.Effect<R, E, A>,
    use: (a: A) => Fx<R2, E2, B>,
    release: (a: A, exit: Exit<never, unknown>) => Effect.Effect<R3, never, C>
  ): Fx<R | R2 | R3, E | E2, B>

  <A, R2, E2, B, R3, C>(
    use: (a: A) => Fx<R2, E2, B>,
    release: (a: A, exit: Exit<never, unknown>) => Effect.Effect<R3, never, C>
  ): <R, E>(acquire: Effect.Effect<R, E, A>) => Fx<R | R2 | R3, E | E2, B>
} = dualWithTrace(
  3,
  (trace) =>
    <R, E, A, R2, E2, B, R3, C>(
      acquire: Effect.Effect<R, E, A>,
      use: (a: A) => Fx<R2, E2, B>,
      release: (a: A, exit: Exit<never, unknown>) => Effect.Effect<R3, never, C>
    ) => new AcquireUseReleaseFx(acquire, use, release).transform((e) => e.traced(trace))
)

export class AcquireUseReleaseFx<R, E, A, R2, E2, B, R3> extends BaseFx<R | R2 | R3, E | E2, B> {
  readonly name = "AcquireUseRelease"

  constructor(
    readonly acquire: Effect.Effect<R, E, A>,
    readonly use: (a: A) => Fx<R2, E2, B>,
    readonly release: (a: A, exit: Exit<never, unknown>) => Effect.Effect<R3, never, unknown>
  ) {
    super()
  }

  run(sink: Sink<E | E2, B>) {
    return Effect.catchAllCause(
      Effect.acquireUseRelease(
        this.acquire,
        (a) => this.use(a).run(sink),
        this.release
      ),
      sink.error
    )
  }
}
