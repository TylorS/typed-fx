import { pipe } from "@effect/data/Function"
import type { Context, Scope } from "@typed/fx/internal/_externals"
import { Cause, Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx } from "@typed/fx/internal/Fx"
import { Sink } from "@typed/fx/internal/Fx"
import { withRefCounter } from "@typed/fx/internal/RefCounter"

export class FlatMapCauseFx<R, E, A, R2, E2, B> extends BaseFx<
  R | R2,
  E | E2,
  A | B
> {
  readonly name = "FlatMapCause" as const

  constructor(
    readonly self: Fx<R, E, A>,
    readonly f: (e: Cause.Cause<E>) => Fx<R2, E2, B>
  ) {
    super()
  }

  run(sink: Sink<E | E2, A | B>) {
    return Effect.contextWithEffect(
      (ctx: Context.Context<R | R2 | Scope.Scope>) =>
        withRefCounter(
          1,
          (counter) =>
            this.self.run(
              Sink(
                sink.event,
                (cause) =>
                  pipe(
                    counter.increment,
                    Effect.flatMap(() =>
                      this.f(cause).run(
                        Sink(sink.event, sink.error, () => Effect.provideContext(counter.decrement, ctx))
                      )
                    ),
                    Effect.onError((cause) =>
                      Cause.isInterruptedOnly(cause)
                        ? Effect.unit()
                        : sink.error(cause)
                    ),
                    Effect.forkScoped,
                    Effect.provideContext(ctx)
                  ),
                () => Effect.provideContext(counter.decrement, ctx)
              )
            ),
          sink.end
        )
    )
  }
}
