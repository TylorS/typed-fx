import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import type { Option } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const succeedSome: <A>(a: A) => Fx<never, never, Option.Option<A>> = bodyWithTrace((trace) =>
  <A>(_: A) => fromEffect(Effect.succeedSome(_)).traced(trace)
)
