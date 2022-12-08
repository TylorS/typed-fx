import { Duration, Effect, Schedule, pipe } from 'effect'

import { Fx } from './Fx.js'
import { scheduled } from './scheduled.js'

export function periodic(delay: Duration.Duration): Fx<never, never, void> {
  return pipe(Effect.unit(), scheduled(Schedule.delayed(() => delay)(Schedule.repeatForever())))
}
