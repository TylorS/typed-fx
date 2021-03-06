import { Timer } from './Timer.js'

import { Clock } from '@/Clock/Clock.js'
import { DateClock } from '@/Clock/DateClock.js'
import { Disposable } from '@/Fx/Disposable/Disposable.js'

export function SetTimeoutTimer(clock: Clock = DateClock()): Timer {
  return Timer(clock, (f, delay) => {
    const id = setTimeout(f, delay)

    return Disposable(() => clearTimeout(id))
  })
}
