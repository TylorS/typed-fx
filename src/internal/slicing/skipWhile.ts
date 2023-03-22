import { dualWithTrace } from "@effect/io/Debug"
import type { Fx, Sink } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const skipWhile: {
  <R, E, A>(self: Fx<R, E, A>, predicate: (value: A) => boolean): Fx<R, E, A>
  <A>(predicate: (value: A) => boolean): <R, E>(self: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(self: Fx<R, E, A>, predicate: (value: A) => boolean) => new SkipWhileFx(self, predicate).traced(trace)
)

export class SkipWhileFx<R, E, A> extends BaseFx<R, E, A> {
  readonly name = "SkipWhile"

  constructor(readonly self: Fx<R, E, A>, readonly predicate: (value: A) => boolean) {
    super()
  }

  run(sink: Sink<E, A>) {
    return this.self.run(new SkipWhileSink(sink, this.predicate))
  }
}

export class SkipWhileSink<E, A> implements Sink<E, A> {
  protected skip = true

  constructor(readonly sink: Sink<E, A>, readonly predicate: (value: A) => boolean) {}

  event(value: A) {
    if (this.skip && (this.skip === this.predicate(value))) {
      return Effect.unit()
    }

    return this.sink.event(value)
  }

  error = this.sink.error
  end = this.sink.end
}
