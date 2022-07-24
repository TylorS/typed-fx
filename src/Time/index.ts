import { Branded } from 'hkt-ts/Branded'
import * as N from 'hkt-ts/number'

/**
 * Monotonic representation of millisecond-precision Time relative to some StartTime.
 * This is used all over the codebase such that tests that depend on time can remain
 * deterministic. It is often intersected with another type (like Date) that will
 * allow turning Time back into that other type.
 */
export type Time = Branded<{ readonly Time: Time }, number>
export const Time = Branded<Time>()

export const TimeAssociative = Time.makeAssociative(N.AssociativeSum)
export const TimeIdentity = Time.makeIdentity(N.IdentitySum)
export const TimeCommutative = Time.makeCommutative(N.AssociativeSum)
export const TimeEq = Time.makeEq(N.Eq)
export const TimeInverse = Time.makeInverse(N.Inverse)
export const TimeOrd = Time.makeOrd(N.Ord)
export const TimeBounded = Time.makeBounded({ ...N.Bounded, bottom: 0 })

/**
 * Millisecond precision Unix Timestamp. Should be directly useable in `new Date(UnixTime)`
 */
export type UnixTime = Branded<{ readonly UnixTime: Time }, number>
export const UnixTime = Branded<UnixTime>()

export const MIN_UNIX_TIME = UnixTime(0)
export const MAX_UNIX_TIME = UnixTime(8.64e15) // WHAT WILL WE DO AFTER +275760-09-13T00:00:00.000Z???

export const UnixTimeAssociative = UnixTime.makeAssociative(N.AssociativeSum)
export const UnixTimeIdentity = UnixTime.makeIdentity(N.IdentitySum)
export const UnixTimeCommutative = UnixTime.makeCommutative(N.AssociativeSum)
export const UnixTimeEq = UnixTime.makeEq(N.Eq)
export const UnixTimeInverse = UnixTime.makeInverse(N.Inverse)
export const UnixTimeOrd = UnixTime.makeOrd(N.Ord)
export const UnixTimeBounded = UnixTime.makeBounded({
  ...N.Bounded,
  bottom: MIN_UNIX_TIME,
  top: MAX_UNIX_TIME,
})

/**
 * Millisecond precision Delay, monotonic in relation to "now". Useful for describing
 * things like `setTimeout(f, Delay)`
 */
export type Delay = Branded<{ readonly Delay: Delay }, number>
export const Delay = Branded<Delay>()

export const DelayAssociative = Delay.makeAssociative(N.AssociativeSum)
export const DelayIdentity = Delay.makeIdentity(N.IdentitySum)
export const DelayCommutative = Delay.makeCommutative(N.AssociativeSum)
export const DelayEq = Delay.makeEq(N.Eq)
export const DelayInverse = Delay.makeInverse(N.Inverse)
export const DelayOrd = Delay.makeOrd(N.Ord)
export const DelayBounded = Delay.makeBounded({ ...N.Bounded, bottom: 0 })
