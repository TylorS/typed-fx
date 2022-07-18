import { Timer } from './Timer'

import { Clock } from '@/Clock/Clock'

export class SetTimeoutTimer extends Timer {
  constructor(readonly clock: Clock) {
    super(clock, (f, delay) => {
      const id = setTimeout(f, delay)

      return () => clearTimeout(id)
    })
  }
}
