import { NonNegativeInteger } from 'hkt-ts/number'

import { Fx, Of } from '@/Fx/Fx'
import { fromLazy, unit } from '@/Fx/index'
import * as FutureQueue from '@/FutureQueue/index'
import { wait } from '@/Future/wait'
import { managed, scoped } from '@/Fx/scoped'
import { constant } from 'hkt-ts/function'

export class Semaphore {
  protected waiting = FutureQueue.make<never, never, void>()
  protected running = 0

  constructor(readonly maxPermits: NonNegativeInteger) {}

  // Retrieve the number of permits still available
  get available(): NonNegativeInteger {
    return NonNegativeInteger(Math.max(0, this.maxPermits - this.running))
  }

  get acquired(): NonNegativeInteger {
    return NonNegativeInteger(this.running)
  }

  readonly prepare = fromLazy(() => {
    if (this.running < this.maxPermits) {
      return new Acquisition(
        fromLazy(() => {
          this.running++
        }),
        this.release,
      )
    }

    const [future] = this.waiting.waitFor(1)

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this
    const acquisition = new Acquisition(
      Fx(function* () {
        yield* wait(future)

        that.running++
      }),
      this.release,
    )

    return acquisition
  })

  protected release = fromLazy(() => {
    this.running = Math.max(0, this.running - 1)

    if (this.waiting.size() > 0) {
      this.waiting.next(unit)
    }
  })
}

export class Acquisition {
  constructor(readonly acquire: Of<void>, readonly release: Of<void>) {}
}

/**
 * Specialization of Semaphore which only allows 1 permit.
 */
export class Lock extends Semaphore {
  constructor() {
    super(NonNegativeInteger(1))
  }
}

/**
 * Acquire a permit from a given semaphore, blocking until it is available.
 * Must be used with Fx.scoped() to release the permit at the desired time.
 */
export function acquirePermit(semaphore: Semaphore) {
  return Fx(function* () {
    const { acquire, release } = yield* semaphore.prepare

    return yield* managed(acquire, constant(release))
  })
}

/**
 * Acquire a permit from a given semaphore, run an Fx, and then release the permit.
 */
export function acquire(semaphore: Semaphore) {
  return <R, E, A>(fx: Fx<R, E, A>) =>
    scoped(
      Fx(function* () {
        yield* acquirePermit(semaphore)

        return yield* fx
      }),
    )
}
