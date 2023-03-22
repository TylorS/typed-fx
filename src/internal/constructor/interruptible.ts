import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"

export const interruptible: <R, E, A>(self: Fx<R, E, A>) => Fx<R, E, A> = methodWithTrace((trace) =>
  <R, E, A>(self: Fx<R, E, A>): Fx<R, E, A> => self.transform(Effect.interruptible).traced(trace)
)
