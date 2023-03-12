import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import type { Either } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const succeedLeft: <A>(
  a: A
) => Fx<never, never, Either.Either<A, never>> = bodyWithTrace((trace) =>
  <A>(a: A) => fromEffect(Effect.succeedLeft(a)).traced(trace)
)
