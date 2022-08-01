import { Lazy } from 'hkt-ts'
import * as Associative from 'hkt-ts/Typeclass/Associative'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import { Service } from '@/Service/index.js'
import { Delay, MAX_UNIX_TIME, MIN_UNIX_TIME, Time, UnixTime } from '@/Time/index.js'

export interface Clock {
  readonly startTime: UnixTime
  readonly getCurrentTime: Lazy<Time>
}

export const Clock = Service<Clock>('Clock')

export function make(startTime: UnixTime, getCurrentTime: Lazy<Time>): Clock {
  return {
    startTime,
    getCurrentTime,
  }
}

export function delayToUnixTime(delay: Delay) {
  return (clock: Clock): UnixTime => UnixTime(clock.startTime + clock.getCurrentTime() + delay)
}

export function timeToDate(time: Time) {
  return (clock: Clock): Date => new Date(clock.startTime + time)
}

export function timeToUnixTime(time: Time) {
  return (clock: Clock): UnixTime => UnixTime(clock.startTime + time)
}

export function dateToTime(date: Date) {
  return (clock: Clock): Time => Time(clock.startTime - date.getTime())
}

export function addDelay(delay: Delay) {
  return (clock: Clock): Time => Time(clock.getCurrentTime() + delay)
}

export function timeToDelay(time: Time) {
  return (clock: Clock): Delay => Delay(Math.max(0, time - clock.getCurrentTime()))
}

export function unixTimeToDelay(time: UnixTime) {
  return (clock: Clock): Delay =>
    Delay(Math.max(0, time - timeToUnixTime(clock.getCurrentTime())(clock)))
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
  id: make(MAX_UNIX_TIME, () => Time(0)),
}

export const IntersectionIdentity: Identity<Clock> = {
  ...IntersectionAssociative,
  id: make(MIN_UNIX_TIME, () => Time(0)),
}

export function fork(clock: Clock): Clock {
  const offset = clock.getCurrentTime()

  return make(timeToUnixTime(offset)(clock), () => Time(clock.getCurrentTime() - offset))
}
