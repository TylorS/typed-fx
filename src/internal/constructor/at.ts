import type { Duration } from "@effect/data/Duration"
import { dual } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"

import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "./fromEffect"

export const at: {
  <A>(value: A, delay: Duration): Fx<never, never, A>
  (delay: Duration): <A>(value: A) => Fx<never, never, A>
} = dual(2, function at<A>(value: A, delay: Duration): Fx<never, never, A> {
  return fromEffect(Effect.as(Effect.sleep(delay), value))
})
