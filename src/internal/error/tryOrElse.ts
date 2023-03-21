import { dualWithTrace } from "@effect/io/Debug"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import type { Context, Scope } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const tryOrElse: {
  <R, E, A, R2, E2, B, R3, E3, C>(
    self: Fx<R, E, A>,
    onFail: () => Fx<R2, E2, B>,
    onSuccess: (a: A) => Fx<R3, E3, C>
  ): Fx<R | R2 | R3, E | E2 | E3, B | C>

  <R2, E2, B, A, R3, E3, C>(
    onFail: () => Fx<R2, E2, B>,
    onSuccess: (a: A) => Fx<R3, E3, C>
  ): <R, E>(self: Fx<R, E, A>) => Fx<R | R2 | R3, E | E2 | E3, B | C>
} = dualWithTrace(
  3,
  (trace) =>
    <R, E, A, R2, E2, B, R3, E3, C>(
      self: Fx<R, E, A>,
      onFail: () => Fx<R2, E2, B>,
      onSuccess: (a: A) => Fx<R3, E3, C>
    ) => new TryOrElseFx(self, onFail, onSuccess).traced(trace)
)

export class TryOrElseFx<R, E, A, R2, E2, B, R3, E3, C> extends BaseFx<R | R2 | R3, E | E2 | E3, B | C> {
  readonly name = "TryOrElse" as const

  constructor(
    readonly self: Fx<R, E, A>,
    readonly onFail: () => Fx<R2, E2, B>,
    readonly onSuccess: (a: A) => Fx<R3, E3, C>
  ) {
    super()
  }

  run(sink: Sink<E | E2 | E3, B | C>) {
    return Effect.contextWith((ctx: Context.Context<R | R2 | R3 | Scope.Scope>) =>
      this.self.run(
        Sink(
          (a) => Effect.provideContext(this.onSuccess(a).run(sink), ctx),
          () => Effect.provideContext(this.onFail().run(sink), ctx),
          sink.end
        )
      )
    )
  }
}
