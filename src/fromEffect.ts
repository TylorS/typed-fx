import { Fx } from "@typed/fx/Fx"
import { Effect } from "./externals"

export function fromEffect<R, E, A>(effect: Effect.Effect<R, E, A>): Fx<R, E, A> {
  return Fx((sink) => Effect.matchCauseEffect(effect, sink.error, sink.event))
}
