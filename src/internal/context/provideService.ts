import type { Tag } from "@effect/data/Context"
import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"

export const provideService: {
  <R, S, E, A>(fx: Fx<R | S, E, A>, service: Tag<S>, implementation: S): Fx<Exclude<R, S>, E, A>
  <S>(service: Tag<S>, implementation: S): <R, E, A>(fx: Fx<R | S, E, A>) => Fx<Exclude<R, S>, E, A>
} = dualWithTrace(
  3,
  (trace) =>
    <R, S, E, A>(fx: Fx<R | S, E, A>, service: Tag<S>, implementation: S): Fx<Exclude<R, S>, E, A> =>
      fx.transform(Effect.provideService(service, implementation)).transform((e) => e.traced(trace))
)
