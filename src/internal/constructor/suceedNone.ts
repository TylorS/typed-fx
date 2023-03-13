import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import type { Option } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const succeedNone: (_: void) => Fx<never, never, Option.Option<never>> = methodWithTrace((trace) =>
  (_: void) => fromEffect(Effect.succeedNone()).traced(trace)
)
