import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"

export function withParallelismUnbounded<R, E, A>(self: Fx<R, E, A>): Fx<R, E, A> {
  return self.transform(Effect.withParallelismUnbounded)
}