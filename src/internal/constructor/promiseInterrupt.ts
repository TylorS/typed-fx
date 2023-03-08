import { flow } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const promiseInterrupt: <A>(promise: (signal: AbortSignal) => Promise<A>) => Fx<never, unknown, A> = flow(
  Effect.promiseInterrupt,
  fromEffect
)
