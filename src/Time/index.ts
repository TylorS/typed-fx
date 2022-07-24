import { Branded } from 'hkt-ts/Branded'

/**
 * Monotonic representation of millisecond-precision Time relative to some StartTime
 */
export type Time = Branded<{ readonly Time: Time }, number>
export const Time = Branded<Time>()

/**
 * Millisecond precision Unix Timestamp
 */
export type UnixTime = Branded<{ readonly UnixTime: Time }, number>
export const UnixTime = Branded<UnixTime>()

/**
 * Millisecond precision Delay, monotonic in relation to "now"
 */
export type Delay = Branded<{ readonly Delay: Delay }, number>
export const Delay = Branded<Delay>()
