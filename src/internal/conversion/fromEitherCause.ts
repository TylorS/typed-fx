import type { Either } from "@effect/data/Either"
import type { Cause } from "@effect/io/Cause"
import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const fromEitherCause: <E, A>(either: Either<Cause<E>, A>) => Fx<never, E, A> = methodWithTrace((trace) =>
  (either) => fromEffect(Effect.fromEitherCause(either)).traced(trace)
)
