import type { Either } from "@effect/data/Either"
import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const fromEither: <E, A>(either: Either<E, A>) => Fx<never, E, A> = methodWithTrace((trace) =>
  (either) => fromEffect(Effect.fromEither(either)).traced(trace)
)
