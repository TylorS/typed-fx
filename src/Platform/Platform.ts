import { NonNegativeInteger } from 'hkt-ts/number'

import { AtomicCounter } from '@/Atomic/AtomicCounter.js'

export interface Platform {
  readonly sequenceNumber: AtomicCounter
  readonly maxOpCount: NonNegativeInteger
  readonly maxTraceCount: NonNegativeInteger
}

export function Platform(
  maxOpCount: NonNegativeInteger,
  maxTraceCount: NonNegativeInteger,
  sequenceNumber: AtomicCounter = AtomicCounter(),
): Platform {
  return {
    sequenceNumber,
    maxOpCount,
    maxTraceCount,
  }
}
