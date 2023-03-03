import { dual } from "@effect/data/Function"
import type { Fx, Sink } from "@typed/fx/Fx"

export const map: {
  <R, E, A, B>(fx: Fx<R, E, A>, f: (a: A) => B): Fx<R, E, B>
  <A, B>(f: (a: A) => B): <R, E>(fx: Fx<R, E, A>) => Fx<R, E, B>
} = dual(2, <R, E, A, B>(fx: Fx<R, E, A>, f: (a: A) => B) => MapFx.make(fx, f))

export class MapFx<R, E, A, B> implements Fx<R, E, B> {
  readonly _tag = "Map" as const

  constructor(readonly fx: Fx<R, E, A>, readonly f: (a: A) => B) {}

  run<R2>(sink: Sink<R2, E, B>) {
    return this.fx.run({
      ...sink,
      event: (a) => sink.event(this.f(a))
    })
  }

  static make<R, E, A, B>(fx: Fx<R, E, A>, f: (a: A) => B): Fx<R, E, B> {
    // Functor composition fusion
    if (isMap(fx)) {
      return new MapFx(fx.fx, (a) => f(fx.f(a)))
    }

    return new MapFx(fx, f)
  }
}

export function isMap<R, E, A>(fx: Fx<R, E, A>): fx is MapFx<R, E, unknown, A> {
  return fx instanceof MapFx
}
