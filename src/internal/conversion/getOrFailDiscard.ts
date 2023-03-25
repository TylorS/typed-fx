import { methodWithTrace } from "@effect/io/Debug"
import type { Option } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const getOrFailDiscard: <A>(option: Option.Option<A>) => Fx<never, void, A> = methodWithTrace((
  trace
) => <A>(option: Option.Option<A>): Fx<never, void, A> => fromEffect(Effect.getOrFailDiscard(option).traced(trace)))
