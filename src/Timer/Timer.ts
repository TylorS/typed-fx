import { Branded } from 'hkt-ts/Branded'

import { Clock, Time } from '@/Clock/Clock'

/**
 * A Timer is a representation of something that can schedule a callback to
 * run with a particular Delay
 */
export class Timer extends Clock {
  constructor(
    readonly clock: Clock,
    readonly setTimer: (f: () => void, delay: Delay) => () => void,
  ) {
    super(clock.startTime, clock.currentTime)
  }

  readonly toDelay = (time: Time): Delay => Delay(time - this.currentTime())
  readonly toTime = (delay: Delay): Time => Time(this.currentTime() + delay)

  override readonly fork = (): Timer => new Timer(this.clock.fork(), this.setTimer)
}

export type Delay = Branded<{ readonly Delay: Delay }, number>
export const Delay = Branded<Delay>()
