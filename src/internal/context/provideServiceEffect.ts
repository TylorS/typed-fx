import type { Tag } from "@effect/data/Context"
import { dualWithTrace } from "@effect/io/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"

export const provideServiceEffect: {
  <R, S, E, A, R2, E2>(
    fx: Fx<R | S, E, A>,
    service: Tag<S>,
    implementation: Effect.Effect<R2, E2, S>
  ): Fx<R2 | Exclude<R, S>, E | E2, A>
  <R2, E2, S>(
    service: Tag<S>,
    implementation: Effect.Effect<R2, E2, S>
  ): <R, E, A>(fx: Fx<R | S, E, A>) => Fx<R2 | Exclude<R, S>, E | E2, A>
} = dualWithTrace(
  3,
  (trace) =>
    <R, S, E, A, R2, E2>(
      fx: Fx<R | S, E, A>,
      service: Tag<S>,
      implementation: Effect.Effect<R2, E2, S>
    ): Fx<R2 | Exclude<R, S>, E | E2, A> =>
      fx.transform(Effect.provideServiceEffect(service, implementation)).traced(trace)
)
