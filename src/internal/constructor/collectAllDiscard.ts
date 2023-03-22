import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { Scope } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"
import { withRefCounter } from "@typed/fx/internal/RefCounter"

export const collectAllDiscard: <R, E, A>(fx: Iterable<Fx<R, E, A>>) => Fx<R, E, void> = methodWithTrace((trace) =>
  <R, E, A>(fx: Iterable<Fx<R, E, A>>) => new CollectAllDiscardFx(fx).traced(trace)
)

export class CollectAllDiscardFx<R, E, A> extends BaseFx<R, E, void> {
  readonly name = "CollectAllDiscard" as const

  constructor(readonly fx: Iterable<Fx<R, E, A>>) {
    super()
  }

  run(sink: Sink<E, void>) {
    const fx = Array.from(this.fx)
    const length = fx.length

    return withRefCounter(length, (counter, scope) =>
      Effect.gen(function*($) {
        const values = Array(length)
        let remaining = length

        for (let i = 0; i < length; i++) {
          yield* $(Effect.forkScoped(fx[i].run(Sink(
            (a) =>
              Effect.suspend(() => {
                if (!(i in values)) {
                  remaining--
                }

                values[i] = a

                if (remaining === 0) {
                  return sink.event()
                }

                return Effect.unit()
              }),
            sink.error,
            () => Effect.provideService(counter.decrement, Scope.Tag, scope)
          ))))
        }
      }), sink.end)
  }
}
