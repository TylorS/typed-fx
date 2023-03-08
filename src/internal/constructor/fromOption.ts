import { flow } from "@effect/data/Function"
import type { Option } from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const fromOption: <A>(option: Option<A>) => Fx<never, Option<never>, A> = flow(
  Effect.fromOption,
  fromEffect
)
