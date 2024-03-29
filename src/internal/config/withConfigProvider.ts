import { dualWithTrace } from "@effect/data/Debug"
import type { ConfigProvider } from "@effect/io/Config/Provider"
import { Effect } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"

export const withConfigProvider: {
  <R, E, A>(fx: Fx<R, E, A>, provider: ConfigProvider): Fx<R, E, A>
  (provider: ConfigProvider): <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(fx: Fx<R, E, A>, provider: ConfigProvider) =>
      fx.transform(Effect.withConfigProvider(provider)).traced(trace)
)
