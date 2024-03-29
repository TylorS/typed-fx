import { dualWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx, Sink } from "@typed/fx/internal/Fx"

export const ensuring: {
  <R, E, A, R2, E2, B>(self: Fx<R, E, A>, finalizer: Effect.Effect<R2, E2, B>): Fx<R | R2, E | E2, A>
  <R2, E2, B>(finalizer: Effect.Effect<R2, E2, B>): <R, E, A>(self: Fx<R, E, A>) => Fx<R | R2, E | E2, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2, B>(self: Fx<R, E, A>, finalizer: Effect.Effect<R2, E2, B>) =>
      new EnsuringFx(self, finalizer).traced(trace)
)

export class EnsuringFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, A> {
  readonly name = "Ensuring"

  constructor(readonly self: Fx<R, E, A>, readonly finalizer: Effect.Effect<R2, E2, B>) {
    super()
  }

  run(sink: Sink<E | E2, A>) {
    return Effect.flatMap(
      Effect.addFinalizer(() => Effect.catchAllCause(this.finalizer, sink.error)),
      () => this.self.run(sink)
    )
  }
}
