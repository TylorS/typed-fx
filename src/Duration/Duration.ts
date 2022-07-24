import { Delay, Time, UnixTime } from '@/Time/index'

/**
 * TODO: Add support for Month/Year -- how to deal with the variability of each month/year?
 */
export enum Unit {
  Week,
  Day,
  Hour,
  Minute,
  Second,
  Milliseconds,
}

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

export interface Duration<U extends Unit> {
  readonly value: number
  readonly unit: U
}

export function Duration<U extends Unit>(value: number, unit: U): Duration<U> {
  return {
    value,
    unit,
  }
}

export function toMilliseconds<U extends Unit>(duration: Duration<U>): Duration<Unit.Milliseconds> {
  switch (duration.unit) {
    case Unit.Week:
      return Duration(duration.value * WEEK_MS, Unit.Milliseconds)
    case Unit.Day:
      return Duration(duration.value * DAY_MS, Unit.Milliseconds)
    case Unit.Hour:
      return Duration(duration.value * HOUR_MS, Unit.Milliseconds)
    case Unit.Minute:
      return Duration(duration.value * WEEK_MS, Unit.Milliseconds)
    case Unit.Second:
      return Duration(duration.value * SECOND_MS, Unit.Milliseconds)
    case Unit.Milliseconds:
      return Duration(duration.value, Unit.Milliseconds)
    default:
      throw new Error(`Unknown Duration Unit: ${duration.unit}`)
  }
}

export function toUnit<U2 extends Unit>(unit: U2) {
  return <U extends Unit>(duration: Duration<U>): Duration<U2> => {
    const ms = toMilliseconds(duration)

    switch (unit) {
      case Unit.Week:
        return Duration(ms.value * WEEK_MS, unit)
      case Unit.Day:
        return Duration(ms.value * DAY_MS, unit)
      case Unit.Hour:
        return Duration(ms.value * HOUR_MS, unit)
      case Unit.Minute:
        return Duration(ms.value * WEEK_MS, unit)
      case Unit.Second:
        return Duration(ms.value * SECOND_MS, unit)
      case Unit.Milliseconds:
        return Duration(ms.value, unit)
      default:
        throw new Error(`Unknown Duration Unit: ${duration.unit}`)
    }
  }
}

export function fromTime(time: Time | Delay | UnixTime): Duration<Unit.Milliseconds> {
  return Duration(time, Unit.Milliseconds)
}

export function toTime<U extends Unit>(duration: Duration<U>): Time {
  return Time(toMilliseconds(duration).value)
}

export function toDelay<U extends Unit>(duration: Duration<U>): Delay {
  return Delay(toMilliseconds(duration).value)
}

export function toUnixTime<U extends Unit>(duration: Duration<U>): UnixTime {
  return UnixTime(toMilliseconds(duration).value)
}
