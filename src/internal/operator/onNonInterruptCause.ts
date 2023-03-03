import { dual } from "@effect/data/Function"
import * as Cause from "@effect/io/Cause"
import type { Effect } from "@effect/io/Effect"
import { catchAllCause } from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"

export const onNonInterruptCause: {
  <R, E, A, R2, E2, B>(
    fx: Fx<R, E, A>,
    f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>
  ): Fx<R | R2, E | E2, A>
  <E, R2, E2, B>(f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>): <R, A>(fx: Fx<R, E, A>) => Fx<R | R2, E | E2, A>
} = dual(2, function onNonInterruptCause<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>
): Fx<R | R2, E | E2, A> {
  return new OnNonInterruptCauseFx(fx, f)
})

export class OnNonInterruptCauseFx<R, E, A, R2, E2, B> implements Fx<R | R2, E | E2, A> {
  constructor(readonly fx: Fx<R, E, A>, readonly f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>) {}

  run<R2>(sink: Sink<R2, E | E2, A>) {
    return this.fx.run({
      ...sink,
      error: (cause) => (Cause.isInterruptedOnly(cause) ? sink.end : catchAllCause(this.f(cause), sink.error))
    })
  }
}
