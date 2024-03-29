import { dualWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"

export const tagged: {
  (key: string, value: string): <R, E, A>(self: Fx<R, E, A>) => Fx<R, E, A>
  <R, E, A>(self: Fx<R, E, A>, key: string, value: string): Fx<R, E, A>
} = dualWithTrace(
  3,
  (trace) =>
    <R, E, A>(self: Fx<R, E, A>, key: string, value: string) => self.transform(Effect.tagged(key, value)).traced(trace)
)
