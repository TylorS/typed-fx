import type { ConfigProvider } from "@effect/io/Config/Provider"
import { methodWithTrace } from "@effect/io/Debug"
import type { Fx, Sink } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const configProviderWith: <R, E, A>(f: (config: ConfigProvider) => Fx<R, E, A>) => Fx<R, E, A> = methodWithTrace(
  (
    trace
  ) => <R, E, A>(f: (config: ConfigProvider) => Fx<R, E, A>) => new ConfigProviderWithFx(f).traced(trace)
)

class ConfigProviderWithFx<R, E, A> extends BaseFx<R, E, A> {
  readonly _tag = "ConfigProviderWith"
  constructor(readonly f: (config: ConfigProvider) => Fx<R, E, A>) {
    super()
  }

  run(sink: Sink<E, A>) {
    return Effect.configProviderWith((config) => this.f(config).run(sink))
  }
}
