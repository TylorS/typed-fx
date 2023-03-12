import { bodyWithTrace } from "@effect/io/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const random = bodyWithTrace((trace) => (_: void) => fromEffect(Effect.random()).traced(trace))
