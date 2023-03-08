import { identity } from "@effect/data/Function"
import type { Fx } from "@typed/fx/Fx"
import { absorbWith } from "@typed/fx/internal/operator/absorbWith"

export const absorb: <R, E, A>(
  fx: Fx<R, E, A>
) => Fx<R, unknown, A> = absorbWith(identity)