import type { Fx } from "@typed/fx/Fx"
import type { Duration } from "@typed/fx/internal/_externals"
import { Effect, Schedule } from "@typed/fx/internal/_externals"
import { scheduleFrom } from "@typed/fx/internal/constructor/scheduleFrom"

export function periodic(duration: Duration.Duration): Fx<never, never, void> {
  return scheduleFrom(Effect.unit(), Schedule.fromDelay(duration))
}
