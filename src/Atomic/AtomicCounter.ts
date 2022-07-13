import { Eq, NonNegativeInteger } from 'hkt-ts/number'

import { Atomic } from './Atomic'

export class AtomicCounter extends Atomic<NonNegativeInteger> {
  constructor(initial: NonNegativeInteger) {
    super(initial, Eq)
  }

  readonly increment = this.update((s) => NonNegativeInteger(s + 1))
  readonly decrement = this.update((s) => NonNegativeInteger(Math.max(0, s - 1)))
}
