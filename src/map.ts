import { Fx, Sink } from "@typed/fx/Fx"

export function map<R, E, A, B>(
  fx: Fx<R, E, A>,
  f: (a: A) => B
): Fx<R, E, B> {
  return Fx((sink) =>
    fx.run(
      Sink(
        (a) => sink.event(f(a)),
        sink.error
      )
    )
  )
}
