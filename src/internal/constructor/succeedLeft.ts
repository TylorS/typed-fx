import { methodWithTrace } from "@effect/data/Debug"
import type { Either } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const succeedLeft: <A>(
  a: A
) => Fx<never, never, Either.Either<A, never>> = methodWithTrace((trace) =>
  <A>(a: A) => fromEffect(Effect.succeedLeft(a)).traced(trace)
)
