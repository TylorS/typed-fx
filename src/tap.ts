import { Effect } from "@typed/fx/externals"
import { Fx, Sink } from "@typed/fx/Fx"

export function tap<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (a: A) => Effect.Effect<R2, E2, B>
): Fx<R | R2, E | E2, A> {
  return Fx(<R3>(sink: Sink<R3, E | E2, A>) =>
    fx.run<R2 | R3>(
      Sink(
        (a: A) => Effect.matchCauseEffect(f(a), sink.error, () => sink.event(a)),
        sink.error
      )
    )
  )
}

export function tapSync<R, E, A, B>(
  fx: Fx<R, E, A>,
  f: (a: A) => B
): Fx<R, E, A> {
  return tap(fx, (a) => Effect.sync(() => f(a)))
}