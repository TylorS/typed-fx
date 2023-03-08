import { identity, pipe } from "@effect/data/Function"
import type { FlatMap } from "@effect/data/typeclass/FlatMap"
import * as Cause from "@effect/io/Cause"
import { dualWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"

import type { Fx, FxTypeLambda } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"
import { withRefCounter } from "@typed/fx/internal/RefCounter"

export const flatMap: FlatMap<FxTypeLambda>["flatMap"] = dualWithTrace(
  2,
  (trace) => <R, E, A, R2, E2, B>(fx: Fx<R, E, A>, f: (a: A) => Fx<R2, E2, B>) => new FlatMapFx(fx, f).traced(trace)
)

export const flatten: <R, E, R2, E2, A>(fx: Fx<R, E, Fx<R2, E2, A>>) => Fx<R | R2, E | E2, A> = flatMap(identity)

class FlatMapFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, B> {
  readonly _tag = "FlatMap" as const

  constructor(readonly fx: Fx<R, E, A>, readonly f: (a: A) => Fx<R2, E2, B>) {
    super()
  }

  run<R3>(sink: Sink<R3, E | E2, B>) {
    return withRefCounter(
      1,
      (counter) =>
        this.fx.run(
          Sink(
            (a) =>
              pipe(
                counter.increment,
                Effect.flatMap(() => this.f(a).run(Sink(sink.event, sink.error, () => counter.decrement))),
                Effect.onError((cause) => Cause.isInterruptedOnly(cause) ? Effect.unit() : sink.error(cause)),
                Effect.forkScoped
              ),
            sink.error,
            () => counter.decrement
          )
        ),
      sink.end
    )
  }
}
