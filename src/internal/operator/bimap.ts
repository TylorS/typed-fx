import { dualWithTrace } from "@effect/io/Debug"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { Cause } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"
import { isMap } from "@typed/fx/internal/operator/map"

export const bimap: {
  <R, E, E2, A, B>(fx: Fx<R, E, A>, f: (a: E) => E2, g: (a: A) => B): Fx<R, E2, B>
  <E, E2, A, B>(f: (a: E) => E2, g: (a: A) => B): <R>(fx: Fx<R, E, A>) => Fx<R, E2, B>
} = dualWithTrace(
  3,
  (trace) => <R, E, E2, A, B>(fx: Fx<R, E, A>, f: (a: E) => E2, g: (a: A) => B) => BimapFx.make(fx, f, g).traced(trace)
)

export class BimapFx<R, E, E2, A, B> extends BaseFx<R, E2, B> {
  readonly _tag = "BiMap" as const

  constructor(readonly fx: Fx<R, E, A>, readonly f: (a: E) => E2, readonly g: (a: A) => B) {
    super()
  }

  run(sink: Sink<E2, B>) {
    return this.fx.run(Sink(
      (a) => sink.event(this.g(a)),
      (e) => sink.error(Cause.map(e, this.f)),
      sink.end
    ))
  }

  static make<R, E, E2, A, B>(fx: Fx<R, E, A>, f: (e: E) => E2, g: (a: A) => B): Fx<R, E2, B> {
    // Covariant fusion
    if (isMap(fx)) {
      return new BimapFx(fx.fx, f, (a) => g(fx.f(a)))
    }

    // Bicovariant fusion
    if (isBimap(fx)) {
      return new BimapFx(fx.fx, (e) => f(fx.f(e)), (a) => g(fx.g(a)))
    }

    return new BimapFx(fx, f, g)
  }
}

export function isBimap<R, E, A>(fx: Fx<R, E, A>): fx is BimapFx<R, unknown, E, unknown, A> {
  return fx instanceof BimapFx
}
