import { Timer } from './Timer'

import { Clock } from '@/Clock/Clock'
import { DateClock } from '@/Clock/DateClock'
import { Disposable } from '@/Disposable/Disposable'

export function SetTimeoutTimer(clock: Clock = DateClock()): Timer {
  return Timer(clock, (f, delay) => {
    const id = setTimeout(f, delay)

    return Disposable(() => clearTimeout(id))
  })
}
