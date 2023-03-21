import { pipe } from "@effect/data/Function"
import { dualWithTrace } from "@effect/io/Debug"
import type { Semaphore } from "@effect/io/Effect"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const withPermits: {
  <R, E, A>(fx: Fx<R, E, A>, semaphore: Semaphore, permits: number): Fx<R, E, A>
  (semaphore: Semaphore, permits: number): <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  3,
  (trace) =>
    <R, E, A>(fx: Fx<R, E, A>, semaphore: Semaphore, permits: number): Fx<R, E, A> =>
      new WithPermitsFx(fx, semaphore, permits).transform((e) => e.traced(trace))
)

export class WithPermitsFx<R, E, A> extends BaseFx<R, E, A> {
  readonly name = `WithPermits(${this.permits})`

  constructor(readonly fx: Fx<R, E, A>, readonly semaphore: Semaphore, readonly permits: number) {
    super()
  }

  run(sink: Sink<E, A>) {
    const andRelease = Effect.zipLeft(this.semaphore.release(this.permits))

    return pipe(
      this.semaphore.take(this.permits),
      Effect.flatMap(() =>
        this.fx.run(Sink(
          sink.event,
          (cause) => pipe(sink.error(cause), andRelease),
          () => pipe(sink.end(), andRelease)
        ))
      )
    )
  }
}
