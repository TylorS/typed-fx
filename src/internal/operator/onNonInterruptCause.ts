import * as Cause from "@effect/io/Cause"
import { dualWithTrace } from "@effect/io/Debug"
import type { Effect } from "@effect/io/Effect"
import { catchAllCause } from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const onNonInterruptCause: {
  <R, E, A, R2, E2, B>(
    fx: Fx<R, E, A>,
    f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>
  ): Fx<R | R2, E | E2, A>
  <E, R2, E2, B>(f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>): <R, A>(fx: Fx<R, E, A>) => Fx<R | R2, E | E2, A>
} = dualWithTrace(2, (trace) =>
  function onNonInterruptCause<R, E, A, R2, E2, B>(
    fx: Fx<R, E, A>,
    f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>
  ): Fx<R | R2, E | E2, A> {
    return new OnNonInterruptCauseFx(fx, f).traced(trace)
  })

export class OnNonInterruptCauseFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, A> {
  readonly _tag = "OnNonInterruptCause" as const

  constructor(readonly fx: Fx<R, E, A>, readonly f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>) {
    super()
  }

  run<R2>(sink: Sink<R2, E | E2, A>) {
    return this.fx.run({
      ...sink,
      error: (cause) => (Cause.isInterruptedOnly(cause) ? sink.end : catchAllCause(this.f(cause), sink.error))
    })
  }
}
