import { NonNegativeInteger } from 'hkt-ts/number'

import { AtomicCounter } from '@/Atomic/AtomicCounter.js'

export class Platform {
  constructor(
    readonly sequenceNumber: AtomicCounter = new AtomicCounter(),
    readonly maxOpCount: NonNegativeInteger = NonNegativeInteger(500),
  ) {}
}
