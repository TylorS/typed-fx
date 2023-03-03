import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { observe } from "@typed/fx/internal/run/observe"

export type Drain = <R, E, A>(fx: Fx<R, E, A>) => Effect.Effect<R, E, void>

export const drain: Drain = observe(Effect.unit) as Drain
