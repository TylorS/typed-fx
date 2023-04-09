import { Effect } from "@typed/fx/externals"
import { Fx } from "@typed/fx/Fx"

export function never<E = never, A = never>(): Fx<never, E, A> {
  return Fx<never, E, A>(() => Effect.never())
}
