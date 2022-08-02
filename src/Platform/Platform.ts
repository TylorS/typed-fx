import { NonNegativeInteger } from 'hkt-ts/number'

import { AtomicCounter } from '@/Atomic/AtomicCounter.js'
import { SetTimeoutTimer } from '@/Timer/SetTimeoutTimer.js'
import * as Timer from '@/Timer/Timer.js'

export interface Platform {
  readonly sequenceNumber: AtomicCounter
  readonly maxOpCount: NonNegativeInteger
  readonly maxTraceCount: NonNegativeInteger
  readonly timer: Timer.Timer
}

export function Platform(
  sequenceNumber: AtomicCounter = AtomicCounter(),
  maxOpCount: NonNegativeInteger = NonNegativeInteger(500),
  maxTraceCount: NonNegativeInteger = NonNegativeInteger(50),
  timer: Timer.Timer = SetTimeoutTimer(),
): Platform {
  return {
    sequenceNumber,
    maxOpCount,
    maxTraceCount,
    timer,
  }
}

export function fork(platform: Platform): Platform {
  return Platform(
    platform.sequenceNumber,
    platform.maxOpCount,
    platform.maxTraceCount,
    Timer.fork(platform.timer),
  )
}
