import { unit } from '@effect/core/io/Effect'
import * as Schedule from '@effect/core/io/Schedule'
import { pipe } from '@fp-ts/data/Function'
import { Duration } from '@tsplus/stdlib/data/Duration'

import { Fx } from './Fx.js'
import { scheduled } from './scheduled.js'

export function periodic(delay: Duration): Fx<never, never, void> {
  return pipe(unit, scheduled(Schedule.delayed(() => delay)(Schedule.repeatForever)))
}
