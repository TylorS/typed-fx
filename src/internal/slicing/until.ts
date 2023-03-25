import { Effect, Fiber, pipe } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx, Sink } from "@typed/fx/internal/Fx"

export class UntilFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, A> {
  readonly name = "Until" as const

  constructor(
    readonly self: Fx<R, E, A>,
    readonly signal: Fx<R2, E2, B>
  ) {
    super()
  }

  run(sink: Sink<E | E2, A>) {
    const { self, signal } = this

    return Effect.gen(function*($) {
      const fiber = yield* $(Effect.forkScoped(self.run(sink)))
      const signalFiber = yield* $(
        pipe(
          signal.observe(() => Effect.interrupt()),
          Effect.matchCauseEffect(sink.error, Effect.unit),
          Effect.forkScoped
        )
      )

      yield* $(Fiber.joinAll([fiber, signalFiber]))
    })
  }
}
