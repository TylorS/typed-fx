import { flow } from "@effect/data/Function"
import type { Cause } from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const failCause: <E>(cause: Cause<E>) => Fx<never, E, never> = flow(Effect.failCause, fromEffect)
