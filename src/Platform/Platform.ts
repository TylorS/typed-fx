import { NonNegativeInteger } from 'hkt-ts/number'

import { AtomicCounter } from '@/Atomic/AtomicCounter'
import { Cause } from '@/Cause/Cause'

const APPROXIMATE_MAX_STACK_TRACE = 500

// TODO: Should keep track of externally provided implementations and reporting to the outside world
export class Platform {
  constructor(
    readonly sequenceNumber: AtomicCounter = new AtomicCounter(NonNegativeInteger(0)),
    readonly maxConcurrency: NonNegativeInteger = NonNegativeInteger(Infinity),
    readonly maxInstructionCount: NonNegativeInteger = NonNegativeInteger(
      APPROXIMATE_MAX_STACK_TRACE,
    ),
    readonly reportFailure: (cause: Cause<any>) => void = (cause) => console.info(cause),
  ) {}

  readonly updateConcurrency = (concurrency: NonNegativeInteger) =>
    new Platform(this.sequenceNumber, concurrency, this.maxInstructionCount, this.reportFailure)

  readonly updateInstructionCount = (instructionCount: NonNegativeInteger) =>
    new Platform(this.sequenceNumber, this.maxConcurrency, instructionCount, this.reportFailure)
}
