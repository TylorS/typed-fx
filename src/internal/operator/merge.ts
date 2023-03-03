import { dual, pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { withRefCounter } from "@typed/fx/internal/RefCounter"

export function mergeAll<Streams extends ReadonlyArray<Fx<any, any, any>>>(
  ...streams: Streams
): Fx<Fx.ServicesOf<Streams[number]>, Fx.ErrorsOf<Streams[number]>, Fx.OutputOf<Streams[number]>> {
  return new MergeAllFx(streams)
}

export const merge: {
  <R, E, A, R2, E2, B>(first: Fx<R, E, A>, second: Fx<R2, E2, B>): Fx<R | R2, E | E2, A | B>
  <R2, E2, B>(second: Fx<R2, E2, B>): <R, E, A>(first: Fx<R, E, A>) => Fx<R | R2, E | E2, A | B>
} = dual(
  2,
  <R, E, A, R2, E2, B>(first: Fx<R, E, A>, second: Fx<R2, E2, B>): Fx<R | R2, E | E2, A | B> => mergeAll(first, second)
)

export class MergeAllFx<Streams extends ReadonlyArray<Fx<any, any, any>>>
  implements Fx<Fx.ServicesOf<Streams[number]>, Fx.ErrorsOf<Streams[number]>, Fx.OutputOf<Streams[number]>>
{
  readonly _tag = "MergeAll" as const

  constructor(readonly streams: Streams) {}

  run<R2>(sink: Sink<R2, Fx.ErrorsOf<Streams[number]>, Fx.OutputOf<Streams[number]>>) {
    return withRefCounter(
      this.streams.length,
      (counter) =>
        pipe(
          this.streams,
          Effect.forEachParDiscard((s) => s.run(Sink(sink.event, sink.error, counter.decrement)))
        ),
      sink.end
    )
  }
}
