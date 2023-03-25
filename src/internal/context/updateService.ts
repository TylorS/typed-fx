import type { Tag } from "@effect/data/Context"
import { dualWithTrace } from "@effect/io/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"

export const updateService: {
  <R, E, A, S>(fx: Fx<R | S, E, A>, service: Tag<S>, f: (service: S) => S): Fx<R | S, E, A>
  <S>(service: Tag<S>, f: (service: S) => S): <R, E, A>(fx: Fx<R | S, E, A>) => Fx<R | S, E, A>
} = dualWithTrace(
  3,
  (trace) =>
    <R, E, A, S>(fx: Fx<R | S, E, A>, service: Tag<S>, f: (service: S) => S): Fx<R | S, E, A> =>
      fx.transform(Effect.updateService(service, f)).traced(trace)
)
