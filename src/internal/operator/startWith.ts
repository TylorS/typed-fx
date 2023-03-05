import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { succeed } from "@typed/fx/internal/constructor/fromEffect"
import { continueWith } from "@typed/fx/internal/operator/continueWith"

export const startWith = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, B>(fx: Fx<R, E, A>, value: B): Fx<R, E, A | B> => continueWith(succeed(value), () => fx).traced(trace)
)
