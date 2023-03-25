import { identity } from "@effect/data/Function"
import { absorbWith } from "@typed/fx/internal/error/absorbWith"
import type { Fx } from "@typed/fx/internal/Fx"

export const absorb: <R, E, A>(
  fx: Fx<R, E, A>
) => Fx<R, unknown, A> = absorbWith(identity)
