import { pipe } from "@effect/data/Function"
import { dualWithTrace, methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"
import { withRefCounter } from "@typed/fx/internal/RefCounter"

export const mergeAll: <Streams extends ReadonlyArray<Fx<any, any, any>>>(
  ...streams: Streams
) => Fx<Fx.ServicesOf<Streams[number]>, Fx.ErrorsOf<Streams[number]>, Fx.OutputOf<Streams[number]>> = methodWithTrace((
  trace
) => <Streams extends ReadonlyArray<Fx<any, any, any>>>(...streams: Streams) => new MergeAllFx(streams).traced(trace))

export const merge: {
  <R, E, A, R2, E2, B>(first: Fx<R, E, A>, second: Fx<R2, E2, B>): Fx<R | R2, E | E2, A | B>
  <R2, E2, B>(second: Fx<R2, E2, B>): <R, E, A>(first: Fx<R, E, A>) => Fx<R | R2, E | E2, A | B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2, B>(first: Fx<R, E, A>, second: Fx<R2, E2, B>): Fx<R | R2, E | E2, A | B> =>
      mergeAll(first, second).traced(trace)
)

export class MergeAllFx<Streams extends ReadonlyArray<Fx<any, any, any>>>
  extends BaseFx<Fx.ServicesOf<Streams[number]>, Fx.ErrorsOf<Streams[number]>, Fx.OutputOf<Streams[number]>>
{
  readonly _tag = "MergeAll" as const

  constructor(readonly streams: Streams) {
    super()
  }

  run<R2>(sink: Sink<R2, Fx.ErrorsOf<Streams[number]>, Fx.OutputOf<Streams[number]>>) {
    return withRefCounter(
      this.streams.length,
      (counter) =>
        pipe(
          this.streams,
          Effect.forEachParDiscard((s) => s.run(Sink(sink.event, sink.error, () => counter.decrement)))
        ),
      sink.end
    )
  }
}
