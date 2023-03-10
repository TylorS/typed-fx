import * as BC from "@effect/data/typeclass/Bicovariant"
import type { Fx, FxTypeLambda } from "@typed/fx/Fx"
import { bimap } from "@typed/fx/internal/operator/bimap"

export const Bicovariant: BC.Bicovariant<FxTypeLambda> = {
  bimap
}

export const mapError: {
  <E, G>(
    f: (e: E) => G
  ): <R, A>(
    self: Fx<R, E, A>
  ) => Fx<R, G, A>
  <R_1, E_1, A_1, G_1>(
    self: Fx<R_1, E_1, A_1>,
    f: (e: E_1) => G_1
  ): Fx<R_1, G_1, A_1>
} = BC.mapLeft(Bicovariant)
