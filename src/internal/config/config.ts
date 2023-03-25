import type { Config } from "@effect/io/Config"
import type { ConfigError } from "@effect/io/Config/Error"
import { methodWithTrace } from "@effect/io/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const config: <A>(config: Config<A>) => Fx<never, ConfigError, A> = methodWithTrace((trace) =>
  <A>(config: Config<A>) => fromEffect(Effect.config(config)).traced(trace)
)
