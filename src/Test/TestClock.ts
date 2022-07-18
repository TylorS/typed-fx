import { Clock, Time } from '@/Clock/Clock'
import { Delay } from '@/Timer/Timer'

export class TestClock extends Clock {
  private _currentTime: Time = Time(0)

  constructor(readonly startTime: Date) {
    super(startTime, () => this._currentTime)
  }

  readonly progessTimeBy = (delay: Delay): Time =>
    (this._currentTime = Time(this._currentTime + delay))

  readonly progessTimeTo = (time: Time): Time => (this._currentTime = Time(time))
}
