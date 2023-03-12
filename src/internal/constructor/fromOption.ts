import type { Option } from "@effect/data/Option"
import { bodyWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const fromOption: <A>(option: Option<A>) => Fx<never, Option<never>, A> = bodyWithTrace((trace) =>
  (option) => fromEffect(Effect.fromOption(option)).traced(trace)
)
