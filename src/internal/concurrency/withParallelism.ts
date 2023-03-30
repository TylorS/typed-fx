import { dualWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"

export const withParallelism: {
  <R, E, A>(self: Fx<R, E, A>, concurrency: number): Fx<R, E, A>
  (concurrency: number): <R, E, A>(self: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(self: Fx<R, E, A>, concurrency: number) =>
      self.transform(Effect.withParallelism(concurrency)).traced(trace)
)
