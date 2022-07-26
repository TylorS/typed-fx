import { Eq, NonNegativeInteger } from 'hkt-ts/number'

import { Atomic } from './Atomic.js'

export class AtomicCounter extends Atomic<NonNegativeInteger> {
  constructor(initial: NonNegativeInteger) {
    super(initial, Eq)
  }

  get increment() {
    return this.update((s) => NonNegativeInteger(s + 1))
  }

  get decrement() {
    return this.update((s) => NonNegativeInteger(Math.max(0, s - 1)))
  }
}
