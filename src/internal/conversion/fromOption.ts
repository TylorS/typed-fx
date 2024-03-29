import { methodWithTrace } from "@effect/data/Debug"
import type { Option } from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const fromOption: <A>(option: Option<A>) => Fx<never, Option<never>, A> = methodWithTrace((trace) =>
  (option) => fromEffect(Effect.fromOption(option)).traced(trace)
)
