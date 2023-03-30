import { methodWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const random = methodWithTrace((trace) => (_: void) => fromEffect(Effect.random()).traced(trace))
