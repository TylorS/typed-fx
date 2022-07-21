import { Lazy } from 'hkt-ts'
import { Branded } from 'hkt-ts/Branded'

import { CurrentDate } from '@/CurrentDate/CurrentDate'
import { Service } from '@/Service/Service'

/**
 * A Monotonic representation of time
 */
export type Time = Branded<{ readonly Time: number }, number>
export const Time = Branded<Time>()

/**
 * A Clock is an abstraction for retrieving a monotonic form of the current time.
 * It is instantiated with the startTime, such that the monotonic form can always be turned back into Wall Clock time.
 */
export class Clock extends Service {
  constructor(readonly startTime: Date, readonly currentTime: Lazy<Time>) {
    super()
  }

  readonly toDate = (time: Time): Date => new Date(this.startTime.getTime() + time)

  readonly fork = (): Clock => {
    const offset = this.currentTime()

    return new Clock(new Date(this.startTime.getTime() + offset), () =>
      Time(this.currentTime() - offset),
    )
  }
}

export class DateClock extends Clock {
  constructor(
    readonly startTime: Date = new Date(),
    readonly currentDate: Lazy<Date> = () => new Date(),
  ) {
    const offset = startTime.getTime()

    super(startTime, () => Time(currentDate().getTime() - offset))
  }
}

export const toDate = (time: Time) => Clock.asks((c) => c.toDate(time))

export const live = Clock.layer(
  CurrentDate.asks((c) => new DateClock(c.currentDate(), c.currentDate)),
)
