import { dualWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx, Sink } from "@typed/fx/internal/Fx"

export const slice: {
  <R, E, A>(self: Fx<R, E, A>, skip: number, take: number): Fx<R, E, A>
  (skip: number, take: number): <R, E, A>(self: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  3,
  (trace) => <R, E, A>(self: Fx<R, E, A>, skip: number, take: number) => new SliceFx(self, skip, take).traced(trace)
)

export class SliceFx<R, E, A> extends BaseFx<R, E, A> {
  readonly name = "SliceFx"

  constructor(readonly self: Fx<R, E, A>, readonly skip: number, readonly take: number) {
    super()
  }

  run(sink: Sink<E, A>) {
    return Effect.suspend(() => this.self.run(new SliceSink(sink, this.skip, this.take)))
  }
}

export class SliceSink<E, A> implements Sink<E, A> {
  protected toSkip = this.skip
  protected toTake = this.take

  constructor(readonly sink: Sink<E, A>, readonly skip: number, readonly take: number) {}

  event(value: A) {
    return Effect.suspend(() => {
      if (this.toSkip > 0) {
        this.toSkip -= 1

        return Effect.unit()
      }

      if (this.toTake > 0) {
        this.toTake -= 1

        return Effect.flatMap(this.sink.event(value), () => this.toTake === 0 ? this.sink.end() : Effect.unit())
      }

      return this.sink.end()
    })
  }

  error = this.sink.error
  end = this.sink.end
}
