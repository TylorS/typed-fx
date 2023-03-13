import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Exit } from "@effect/io/Exit"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const done: <E, A>(error: Exit<E, A>) => Fx<never, E, A> = methodWithTrace((trace) =>
  (error) => fromEffect(Effect.done(error)).traced(trace)
)
