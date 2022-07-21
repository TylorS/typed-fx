import * as D from 'hkt-ts/Typeclass/Debug'
import * as E from 'hkt-ts/Typeclass/Eq'
import { unsafeCoerce } from 'hkt-ts/function'
import * as N from 'hkt-ts/number'

import { Clock, Time } from '@/Clock/Clock'

// TODO: Add a TraceLocation ?
export interface FiberId {
  /**
   * The monotonic id of a Fiber
   */
  readonly sequenceNumber: number

  /**
   * The Time at which a FiberId started in relation to its parent
   */
  readonly startTime: Time
}

export function FiberId(sequenceNumber: number, startTime: Time): FiberId {
  return {
    sequenceNumber,
    startTime,
  }
}

export const None = FiberId(-1, unsafeCoerce(-1))

export const isNone = (id: FiberId): boolean => id.sequenceNumber === -1

export const Eq: E.Eq<FiberId> = E.struct({
  sequenceNumber: N.Eq,
  startTime: Time.makeEq(N.Eq),
})

export const Debug: D.Debug<FiberId> = {
  debug: (id) => `Fiber #${id.sequenceNumber} (started at ${id.startTime})`,
}

export const makeDebug = (clock: Clock): D.Debug<FiberId> => ({
  debug: (id) =>
    `Fiber #${id.sequenceNumber} (started at ${clock.toDate(id.startTime).toISOString()})`,
})
