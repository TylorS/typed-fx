import { flow } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const fail: <E>(error: E) => Fx<never, E, never> = flow(Effect.fail, fromEffect)
