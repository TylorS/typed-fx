import type { Duration } from "@effect/data/Duration"
import * as Effect from "@effect/io/Effect"

import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "../conversion/fromEffect"

export const at: {
  <A>(value: A, delay: Duration): Fx<never, never, A>
  (delay: Duration): <A>(value: A) => Fx<never, never, A>
} = dualWithTrace(2, (trace) =>
  <A>(value: A, delay: Duration): Fx<never, never, A> => {
    return fromEffect(Effect.as(Effect.sleep(delay), value)).traced(trace)
  })
