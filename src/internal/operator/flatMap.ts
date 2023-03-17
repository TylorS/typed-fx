import type { Context } from "@effect/data/Context"
import { identity, pipe } from "@effect/data/Function"
import type { FlatMap } from "@effect/data/typeclass/FlatMap"
import { dualWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"

import type { Fx, FxTypeLambda } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/conversion"
import { BaseFx } from "@typed/fx/internal/Fx"
import { withRefCounter } from "@typed/fx/internal/RefCounter"

export const flatMap: FlatMap<FxTypeLambda>["flatMap"] = dualWithTrace(
  2,
  (trace) => <R, E, A, R2, E2, B>(fx: Fx<R, E, A>, f: (a: A) => Fx<R2, E2, B>) => FlatMapFx.make(fx, f).traced(trace)
)

export const flatten: <R, E, R2, E2, A>(fx: Fx<R, E, Fx<R2, E2, A>>) => Fx<R | R2, E | E2, A> = flatMap(identity)

export const flatMapEffect = <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) =>
  <R, E>(fx: Fx<R, E, A>) => FlatMapFx.make(fx, (a) => fromEffect(f(a)))

class FlatMapFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, B> {
  readonly _tag = "FlatMap" as const

  constructor(readonly fx: Fx<R, E, A>, readonly f: (a: A) => Fx<R2, E2, B>) {
    super()
  }

  run(sink: Sink<E | E2, B>) {
    return Effect.contextWithEffect((context: Context<R | R2 | Scope>) =>
      withRefCounter(
        // Start with 1 to account for the outer Fx
        1,
        (counter) =>
          this.fx.run(
            Sink(
              (a) =>
                pipe(
                  counter.increment,
                  Effect.zipRight(counter.refCounted(this.f(a), sink)),
                  Effect.forkScoped,
                  Effect.provideContext(context)
                ),
              sink.error,
              () => Effect.provideContext(counter.decrement, context)
            )
          ),
        sink.end
      )
    )
  }

  static make = <R, E, A, R2, E2, B>(fx: Fx<R, E, A>, f: (a: A) => Fx<R2, E2, B>) => new FlatMapFx(fx, f)
}
