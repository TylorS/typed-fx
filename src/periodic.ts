import { unit } from '@effect/core/io/Effect'
import * as Schedule from '@effect/core/io/Schedule'
import { pipe } from '@fp-ts/data/Function'
import { Duration } from '@tsplus/stdlib/data/Duration'

import { Push } from './Push.js'
import { scheduled } from './scheduled.js'

export function periodic(delay: Duration): Push<never, never, void> {
  return pipe(unit, scheduled(Schedule.delayed(() => delay)(Schedule.repeatForever)))
}
