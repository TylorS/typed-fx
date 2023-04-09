import { Effect } from "@typed/fx/externals"
import { Fx } from "@typed/fx/Fx"

export function fromFxEffect<R, E, R2, E2, B>(
  effect: Effect.Effect<R, E, Fx<R2, E2, B>>
): Fx<R | R2, E | E2, B> {
  return Fx((sink) => Effect.matchCauseEffect(effect, sink.error, (fx) => fx.run(sink)))
}
