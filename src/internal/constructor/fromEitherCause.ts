import type { Either } from "@effect/data/Either"
import { flow } from "@effect/data/Function"
import type { Cause } from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const fromEitherCause: <E, A>(either: Either<Cause<E>, A>) => Fx<never, E, A> = flow(
  Effect.fromEitherCause,
  fromEffect
)
