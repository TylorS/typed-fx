import type { Duration } from "@typed/fx/externals"
import { Effect } from "@typed/fx/externals"
import { Fx } from "@typed/fx/Fx"

export function at<A>(value: A, delay: Duration.Duration): Fx<never, never, A> {
  return Fx(
    (sink) =>
      Effect.delay(
        sink.event(value),
        delay
      )
  )
}
