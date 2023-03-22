import type { Predicate, Refinement } from "@effect/data/Predicate"
import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { Effect, Option } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"
import { isMap } from "@typed/fx/internal/operator"

export const filterMap: {
  <R, E, A, B>(self: Fx<R, E, A>, f: (a: A) => Option.Option<B>): Fx<R, E, B>
  <A, B>(f: (a: A) => Option.Option<B>): <R, E>(
    self: Fx<R, E, A>
  ) => Fx<R, E, B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, B>(
      self: Fx<R, E, A>,
      f: (a: A) => Option.Option<B>
    ): Fx<R, E, B> => FilterMapFx.make(self, f).traced(trace)
)

export const filter: {
  <R, E, A, B extends A>(self: Fx<R, E, A>, refinement: Refinement<A, B>): Fx<R, E, B>
  <R, E, A>(self: Fx<R, E, A>, predicate: Predicate<A>): Fx<R, E, A>

  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Fx<R, E, A>) => Fx<R, E, B>
  <A>(predicate: Predicate<A>): <R, E>(self: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(self: Fx<R, E, A>, predicate: Predicate<A>): Fx<R, E, A> =>
      filterMap(self, (a) => predicate(a) ? Option.some(a) : Option.none()).traced(trace)
)

export const filterNot: {
  <R, E, A, B extends A>(self: Fx<R, E, A>, refinement: Refinement<A, B>): Fx<R, E, Exclude<A, B>>
  <R, E, A>(self: Fx<R, E, A>, predicate: Predicate<A>): Fx<R, E, A>

  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Fx<R, E, A>) => Fx<R, E, Exclude<A, B>>
  <A>(predicate: Predicate<A>): <R, E>(self: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(self: Fx<R, E, A>, predicate: Predicate<A>): Fx<R, E, A> =>
      filterMap(self, (a) => !predicate(a) ? Option.some(a) : Option.none()).traced(trace)
)

export class FilterMapFx<R, E, A, B> extends BaseFx<R, E, B> {
  readonly name = "FilterMap" as const

  constructor(
    readonly self: Fx<R, E, A>,
    readonly f: (a: A) => Option.Option<B>
  ) {
    super()
  }

  run(sink: Sink<E, B>) {
    return this.self.run(
      Sink(
        (a) => Option.match(this.f(a), Effect.unit, sink.event),
        sink.error,
        sink.end
      )
    )
  }

  static make<R, E, A, B>(
    self: Fx<R, E, A>,
    f: (a: A) => Option.Option<B>
  ): Fx<R, E, B> {
    if (isFilterMap(self)) {
      return new FilterMapFx(self.self, (a) => Option.flatMap(self.f(a), f))
    }

    if (isMap(self)) {
      return new FilterMapFx(self.fx, (a) => f(self.f(a)))
    }

    return new FilterMapFx(self, f)
  }
}

export function isFilterMap<R, E, A>(
  fx: Fx<R, E, A>
): fx is FilterMapFx<R, E, unknown, A> {
  return fx instanceof FilterMapFx
}
