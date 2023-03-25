import { Effect, pipe } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx, Sink } from "@typed/fx/internal/Fx"
import { filter } from "@typed/fx/internal/operator/filterMap"

export class SinceFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, A> {
  readonly name = "Since" as const

  constructor(readonly self: Fx<R, E, A>, readonly signal: Fx<R2, E2, B>) {
    super()
  }

  run(sink: Sink<E | E2, A>) {
    const { self, signal } = this

    return Effect.gen(function*($) {
      let shouldRun = false

      yield* $(
        pipe(
          signal.observe(() => Effect.flatMap(Effect.sync(() => shouldRun = true), Effect.interrupt)),
          Effect.matchCauseEffect(sink.error, Effect.unit),
          Effect.forkScoped
        )
      )

      return yield* $(
        filter(self, () => shouldRun).run(sink)
      )
    })
  }
}
