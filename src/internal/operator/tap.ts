import type { Context } from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import { dualWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"

import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const tap: {
  <R, E, A, R2, E2, B>(fx: Fx<R, E, A>, f: (a: A) => Effect.Effect<R2, E2, B>): Fx<R | R2, E | E2, A>
  <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>): <R, E>(fx: Fx<R, E, A>) => Fx<R | R2, E | E2, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2, B>(fx: Fx<R, E, A>, f: (a: A) => Effect.Effect<R2, E2, B>) => TapFx.make(fx, f).traced(trace)
)

export const tapSync: {
  <R, E, A, B>(fx: Fx<R, E, A>, f: (a: A) => B): Fx<R, E, A>
  <A, B>(f: (a: A) => B): <R, E>(fx: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, B>(fx: Fx<R, E, A>, f: (a: A) => B) => TapFx.make(fx, (a) => Effect.sync(() => f(a))).traced(trace)
)

class TapFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, A> {
  readonly _tag = "FlatMap" as const

  constructor(readonly fx: Fx<R, E, A>, readonly f: (a: A) => Effect.Effect<R2, E2, B>) {
    super()
  }

  run(sink: Sink<E | E2, A>) {
    return Effect.contextWithEffect((context: Context<R | R2 | Scope>) =>
      this.fx.run(
        Sink(
          (a) =>
            pipe(
              Effect.as(this.f(a), a),
              Effect.matchCauseEffect(sink.error, sink.event),
              Effect.provideContext(context)
            ),
          sink.error,
          sink.end
        )
      )
    )
  }

  static make = <R, E, A, R2, E2, B>(fx: Fx<R, E, A>, f: (a: A) => Effect.Effect<R2, E2, B>) => new TapFx(fx, f)
}
