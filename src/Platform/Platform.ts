import { NonNegativeInteger } from 'hkt-ts/number'

import { AtomicCounter } from '@/Atomic/AtomicCounter'

const APPROXIMATE_MAX_STACK_TRACE = 500

// TODO: Should keep track of externally provided implementations and reporting to the outside world
export class Platform {
  constructor(
    readonly sequenceNumber: AtomicCounter = new AtomicCounter(NonNegativeInteger(0)),
    readonly maxConcurrency: NonNegativeInteger = NonNegativeInteger(Infinity),
    readonly maxInstructionCount: NonNegativeInteger = NonNegativeInteger(
      APPROXIMATE_MAX_STACK_TRACE,
    ),
  ) {}
}
