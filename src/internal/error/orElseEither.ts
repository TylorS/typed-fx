import { dualWithTrace } from "@effect/io/Debug"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import type { Context, Scope } from "@typed/fx/internal/_externals"
import { Effect, Either } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const orElseEither: {
  <R, E, A, R1, E1, A1>(
    self: Fx<R, E, A>,
    that: () => Fx<R1, E1, Either.Either<A, A1>>
  ): Fx<R | R1, E | E1, Either.Either<A, A1>>
  <R1, E1, A, A1>(
    that: () => Fx<R1, E1, Either.Either<A, A1>>
  ): <R, E>(self: Fx<R, E, A>) => Fx<R | R1, E | E1, Either.Either<A, A1>>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R1, E1, A1>(self: Fx<R, E, A>, that: () => Fx<R1, E1, Either.Either<A, A1>>) =>
      new OrElseEitherFx(self, that).traced(trace)
)

class OrElseEitherFx<R, E, A, R1, E1, A1> extends BaseFx<R | R1, E | E1, Either.Either<A, A1>> {
  readonly _tag = "OrElseEither" as const

  constructor(readonly self: Fx<R, E, A>, readonly that: () => Fx<R1, E1, Either.Either<A, A1>>) {
    super()
  }

  run(sink: Sink<E | E1, Either.Either<A, A1>>) {
    return Effect.contextWith((ctx: Context.Context<R1 | Scope.Scope>) =>
      this.self.run(
        Sink(
          (a) => sink.event(Either.left(a)),
          () => Effect.provideContext(this.that().run(sink), ctx),
          sink.end
        )
      )
    )
  }
}
