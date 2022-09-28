import { Empty, interrupted, makeSequentialAssociative } from '@/Cause/Cause.js'
import { Disposable } from '@/Disposable/Disposable.js'
import { FiberId } from '@/FiberId/FiberId.js'

const concatCause = makeSequentialAssociative<never>().concat

export class InterruptManager {
  protected _interruptedBy: Array<FiberId> = []

  constructor(protected interruptStatus: boolean) {}

  getInterruptStatus(): boolean {
    return this.interruptStatus
  }

  setInterruptStatus(interruptStatus: boolean): Disposable {
    const currentStatus = this.interruptStatus
    this.interruptStatus = interruptStatus

    return Disposable(() => {
      this.interruptStatus = currentStatus
    })
  }

  shouldInterrupt() {
    return this._interruptedBy.length > 0
  }

  makeCause() {
    return this._interruptedBy.map((id) => interrupted(id)).reduce(concatCause, Empty)
  }

  makeFiberId() {
    return this._interruptedBy.length > 0
      ? new FiberId.Synthetic(this._interruptedBy)
      : FiberId.None
  }

  interruptAs(id: FiberId) {
    this._interruptedBy.push(id)

    return this.interruptStatus
  }
}
