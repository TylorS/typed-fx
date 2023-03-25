import { pipe } from "@effect/data/Function"
import { dualWithTrace } from "@effect/io/Debug"
import { Cause, Effect, Fiber } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx } from "@typed/fx/internal/Fx"
import { Sink } from "@typed/fx/internal/Fx"
import { tap } from "@typed/fx/internal/operator/tap"

export const mergeRace: {
  <R, E, A, R2, E2, B>(fx: Fx<R, E, A>, raced: Fx<R2, E2, B>): Fx<R | R2, E | E2, A | B>
  <R2, E2, B>(raced: Fx<R2, E2, B>): <R, E, A>(fx: Fx<R, E, A>) => Fx<R | R2, E | E2, A | B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2, B>(fx: Fx<R, E, A>, raced: Fx<R2, E2, B>): Fx<R | R2, E | E2, A | B> =>
      new MergeRaceFx(fx, raced).traced(trace)
)

export class MergeRaceFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, A | B> {
  readonly name = "MergeRace" as const

  constructor(readonly fx: Fx<R, E, A>, readonly raced: Fx<R2, E2, B>) {
    super()
  }

  run(sink: Sink<E | E2, A | B>) {
    const { fx, raced } = this

    return Effect.gen(function*($) {
      let interrupted = false
      const racedFiber = yield* $(
        pipe(
          raced.run(Sink(sink.event, sink.error, Effect.unit)),
          Effect.onError((cause) => Cause.isInterruptedOnly(cause) ? Effect.unit() : sink.error(cause)),
          Effect.forkScoped
        )
      )

      return yield* $(
        tap(fx, () => interrupted ? Effect.unit() : ((interrupted = true), Fiber.interruptFork(racedFiber)))
          .run(
            sink
          )
      )
    })
  }
}
