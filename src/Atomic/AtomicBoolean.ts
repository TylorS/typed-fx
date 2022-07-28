import { Eq } from 'hkt-ts/boolean'

import { Atomic } from './Atomic.js'

export class AtomicBoolean extends Atomic<boolean> {
  constructor(initial: boolean) {
    super(initial, Eq)
  }

  readonly toggle = () =>
    this.modify((a) => {
      const negated = !a

      return [negated, negated]
    })
}
