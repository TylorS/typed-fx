import * as C from "@effect/data/typeclass/Chainable"
import type { Fx, FxTypeLambda } from "@typed/fx/internal/Fx"
import { Covariant } from "@typed/fx/internal/typeclass/Covariant"
import { FlatMap } from "@typed/fx/internal/typeclass/FlatMap"

export const Chainable: C.Chainable<FxTypeLambda> = {
  ...Covariant,
  ...FlatMap
}

export const andThenDiscard: {
  <R2, E2, _>(
    that: Fx<R2, E2, _>
  ): <R1, E1, A>(
    self: Fx<R1, E1, A>
  ) => Fx<R2 | R1, E2 | E1, A>

  <R1, E1, A, R2, E2, _>(
    self: Fx<R1, E1, A>,
    that: Fx<R2, E2, _>
  ): Fx<R2 | R1, E2 | E1, A>
} = C.andThenDiscard(Chainable)

export const bind: {
  <N extends string, A extends object, R2, E2, B>(
    name: Exclude<N, keyof A>,
    f: (a: A) => Fx<R2, E2, B>
  ): <R1, E1>(self: Fx<R1, E1, A>) => Fx<R2 | R1, E2 | E1, { [K in N | keyof A]: K extends keyof A ? A[K] : B }>
  <R1, E1, A extends object, N extends string, R2, E2, B>(
    self: Fx<R1, E1, A>,
    name: Exclude<N, keyof A>,
    f: (a: A) => Fx<R2, E2, B>
  ): Fx<R1 | R2, E1 | E2, { [K in N | keyof A]: K extends keyof A ? A[K] : B }>
} = C.bind(Chainable)

export const tap: {
  <A, R2, E2, _>(f: (a: A) => Fx<R2, E2, _>): <O1, E1>(self: Fx<O1, E1, A>) => Fx<R2 | O1, E2 | E1, A>
  <R1, E1, A, R2, E2, _>(
    self: Fx<R1, E1, A>,
    f: (a: A) => Fx<R2, E2, _>
  ): Fx<R1 | R2, E1 | E2, A>
} = C.tap(Chainable)
