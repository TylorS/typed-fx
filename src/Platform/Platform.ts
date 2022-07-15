import { NonNegativeInteger } from 'hkt-ts/number'

import { AtomicCounter } from '@/Atomic/AtomicCounter'
import { Cause } from '@/Cause/Cause'

const APPROXIMATE_MAX_STACK_TRACE = 1024 // It should be 2-4x higher, but it's really dependent on the memory used so lets just be a little safer.

// TODO: Should keep track of externally provided implementations and reporting to the outside world
export class Platform {
  constructor(
    readonly sequenceNumber: AtomicCounter = new AtomicCounter(NonNegativeInteger(0)),
    readonly maxConcurrency: NonNegativeInteger = NonNegativeInteger(Infinity),
    readonly maxInstructionCount: NonNegativeInteger = NonNegativeInteger(
      APPROXIMATE_MAX_STACK_TRACE,
    ),
    readonly maxStackTraceLength: NonNegativeInteger = NonNegativeInteger(1024 ** 2),
    readonly reportFailure: (cause: Cause<any>) => void = (cause) => console.info(cause),
  ) {}

  readonly updateConcurrency = (concurrency: NonNegativeInteger): Platform =>
    new Platform(
      this.sequenceNumber,
      concurrency,
      this.maxInstructionCount,
      this.maxStackTraceLength,
      this.reportFailure,
    )

  readonly updateInstructionCount = (instructionCount: NonNegativeInteger): Platform =>
    new Platform(
      this.sequenceNumber,
      this.maxConcurrency,
      instructionCount,
      this.maxStackTraceLength,
      this.reportFailure,
    )

  readonly updateStrackTraceLength = (strackTraceLength: NonNegativeInteger): Platform =>
    new Platform(
      this.sequenceNumber,
      this.maxConcurrency,
      this.maxInstructionCount,
      strackTraceLength,
      this.reportFailure,
    )
}
