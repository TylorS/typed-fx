import { NonNegativeInteger } from 'hkt-ts/number'

import { AtomicCounter } from '@/Atomic/AtomicCounter.js'
import { Renderer, defaultRenderer } from '@/Cause/Renderer.js'
import { SetTimeoutTimer } from '@/Timer/SetTimeoutTimer.js'
import * as Timer from '@/Timer/Timer.js'

export interface Platform {
  readonly sequenceNumber: AtomicCounter
  readonly maxOpCount: NonNegativeInteger
  readonly maxTraceCount: NonNegativeInteger
  readonly timer: Timer.Timer
  readonly renderer: Renderer<any>
  readonly reportFailure: (message: string) => void
  readonly fork: () => Platform
}

export function Platform(
  sequenceNumber: AtomicCounter = AtomicCounter(),
  maxOpCount: NonNegativeInteger = NonNegativeInteger(500),
  maxTraceCount: NonNegativeInteger = NonNegativeInteger(50),
  timer: Timer.Timer = SetTimeoutTimer(),
  renderer: Renderer<any> = defaultRenderer,
  reportFailure: (message: string) => void = console.error,
): Platform {
  const platform: Platform = {
    sequenceNumber,
    maxOpCount,
    maxTraceCount,
    timer,
    renderer,
    reportFailure,
    fork: () => fork(platform),
  }

  return platform
}

export function fork(platform: Platform, overrides?: Partial<Omit<Platform, 'fork'>>): Platform {
  return Platform(
    overrides?.sequenceNumber ?? platform.sequenceNumber,
    overrides?.maxOpCount ?? platform.maxOpCount,
    overrides?.maxTraceCount ?? platform.maxTraceCount,
    overrides?.timer ?? Timer.fork(platform.timer),
    overrides?.renderer ?? platform.renderer,
    overrides?.reportFailure ?? platform.reportFailure,
  )
}
