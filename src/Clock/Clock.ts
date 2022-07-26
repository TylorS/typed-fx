import { Lazy } from 'hkt-ts'
import * as Associative from 'hkt-ts/Typeclass/Associative'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import { Service } from '@/Service/index.js'
import { MAX_UNIX_TIME, MIN_UNIX_TIME, Time, UnixTime } from '@/Time/index.js'

export interface Clock {
  readonly startTime: UnixTime
  readonly getCurrentTime: Lazy<Time>
}

export function Clock(startTime: UnixTime, getCurrentTime: Lazy<Time>): Clock {
  return {
    startTime,
    getCurrentTime,
  }
}

export namespace Clock {
  export const service: Service<Clock> = Service<Clock>('Clock')
}

export function toDate(time: Time) {
  return (clock: Clock): Date => new Date(clock.startTime + time)
}

export function toTime(date: Date) {
  return (clock: Clock): Time => Time(clock.startTime - date.getTime())
}

export const UnionAssociative: Associative.Associative<Clock> = {
  concat: (f, s) => (f.startTime <= s.startTime ? f : s),
}

export const IntersectionAssociative: Associative.Associative<Clock> =
  Associative.reverse(UnionAssociative)

export const or =
  (second: Clock) =>
  (first: Clock): Clock =>
    UnionAssociative.concat(first, second)

export const and =
  (second: Clock) =>
  (first: Clock): Clock =>
    IntersectionAssociative.concat(first, second)

export const UnionIdentity: Identity<Clock> = {
  ...UnionAssociative,
  id: Clock(MAX_UNIX_TIME, () => Time(0)),
}

export const IntersectionIdentity: Identity<Clock> = {
  ...IntersectionAssociative,
  id: Clock(MIN_UNIX_TIME, () => Time(0)),
}
