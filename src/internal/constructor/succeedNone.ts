import { methodWithTrace } from "@effect/data/Debug"
import type { Option } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const succeedNone: (_: void) => Fx<never, never, Option.Option<never>> = methodWithTrace((trace) =>
  (_: void) => fromEffect(Effect.succeedNone()).traced(trace)
)
