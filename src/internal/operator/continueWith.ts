import { dual } from "@effect/data/Function"
import type { Effect } from "@effect/io/Effect"
import { suspendSucceed } from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const continueWith: {
  <R, E, A, R2, E2, B>(
    fx: Fx<R, E, A>,
    f: () => Fx<R2, E2, B>
  ): Fx<R | R2, E | E2, A | B>

  <R2, E2, B>(f: () => Fx<R2, E2, B>): <R, E, A>(fx: Fx<R, E, A>) => Fx<R | R2, E | E2, A | B>
} = dual(2, <R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: () => Fx<R2, E2, B>
): Fx<R | R2, E | E2, A | B> => new ContinueWithFx(fx, f))

export class ContinueWithFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, A | B> {
  readonly _tag = "ContinueWith"

  constructor(readonly fx: Fx<R, E, A>, readonly f: () => Fx<R2, E2, B>) {
    super()
  }

  run<R3>(
    sink: Sink<R3, E | E2, A | B>
  ): Effect<R | R2 | R3 | Scope, never, void> {
    return this.run(
      Sink(
        sink.event,
        sink.error,
        () => suspendSucceed(() => this.f().run(sink))
      )
    )
  }
}
