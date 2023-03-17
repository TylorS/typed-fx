import type { ConfigProvider } from "@effect/io/Config/Provider"
import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"

export const withConfigProvider: {
  <R, E, A>(fx: Fx<R, E, A>, provider: ConfigProvider): Fx<R, E, A>
  (provider: ConfigProvider): <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(fx: Fx<R, E, A>, provider: ConfigProvider) =>
      fx.transform(Effect.withConfigProvider(provider)).transform((e) => e.traced(trace))
)
