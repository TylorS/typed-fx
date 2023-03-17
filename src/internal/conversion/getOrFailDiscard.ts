import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import type { Option } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const getOrFailDiscard: <A>(option: Option.Option<A>) => Fx<never, void, A> = methodWithTrace((
  trace
) =>
  <A>(option: Option.Option<A>): Fx<never, void, A> =>
    fromEffect(Effect.getOrFailDiscard(option).transform((e) => e.traced(trace)))
)
