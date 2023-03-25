import { methodWithTrace } from "@effect/io/Debug"
import type { Either } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const succeedRight: <A>(
  a: A
) => Fx<never, never, Either.Either<never, A>> = methodWithTrace((trace) =>
  <A>(a: A) => fromEffect(Effect.succeedRight(a)).traced(trace)
)
