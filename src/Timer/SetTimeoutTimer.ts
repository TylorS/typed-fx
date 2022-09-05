import { Timer, make } from './Timer.js'

import { Clock } from '@/Clock/Clock.js'
import { DateClock } from '@/Clock/DateClock.js'
import { Disposable } from '@/Disposable/Disposable.js'

export function SetTimeoutTimer(clock: Clock = DateClock()): Timer {
  return make(clock, (f, delay) => {
    if (delay <= 0) {
      const id = setImmediate(() => f(clock.getCurrentTime()))

      return Disposable(() => clearImmediate(id))
    }

    const id = setTimeout(() => f(clock.getCurrentTime()), delay)

    return Disposable(() => clearTimeout(id))
  })
}
