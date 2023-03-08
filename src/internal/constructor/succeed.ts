import { flow } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const succeed: <A>(value: A) => Fx<never, never, A> = flow(Effect.succeed, fromEffect)
