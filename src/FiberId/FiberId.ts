import { Time } from '@/Clock/Clock'

// TODO: Add a TraceLocation ?
export interface FiberId {
  /**
   * The monotonic id of a Fiber
   */
  readonly sequenceNumber: number

  /**
   * The Time at which a FiberId started in relation to its parent
   */
  readonly startTime: Time
}

export function FiberId(sequenceNumber: number, startTime: Time): FiberId {
  return {
    sequenceNumber,
    startTime,
  }
}

export const None = FiberId(-1, Time(-1))

export const isNone = (id: FiberId): boolean => id.sequenceNumber === -1
