import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import type { Either } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const succeedRight: <A>(
  a: A
) => Fx<never, never, Either.Either<never, A>> = bodyWithTrace((trace) =>
  <A>(a: A) => fromEffect(Effect.succeedRight(a)).traced(trace)
)
