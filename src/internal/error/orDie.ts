import { identity } from "@effect/data/Function"
import type { Fx } from "@typed/fx/internal/Fx"
import { orDieWith } from "./orDieWith"

export const orDie = <R, E, A>(fx: Fx<R, E, A>): Fx<R, never, A> => orDieWith(fx, identity)
