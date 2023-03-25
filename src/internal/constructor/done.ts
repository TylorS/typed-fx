import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Exit } from "@effect/io/Exit"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const done: <E, A>(error: Exit<E, A>) => Fx<never, E, A> = methodWithTrace((trace) =>
  (error) => fromEffect(Effect.done(error)).traced(trace)
)
