import type { Either } from "@effect/data/Either"
import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const fromEither: <E, A>(either: Either<E, A>) => Fx<never, E, A> = methodWithTrace((trace) =>
  (either) => fromEffect(Effect.fromEither(either)).traced(trace)
)
