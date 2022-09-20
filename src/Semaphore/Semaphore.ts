import { constant, pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { AtomicCounter, decrement, increment } from '@/Atomic/AtomicCounter.js'
import { MutableFutureQueue } from '@/Future/MutableFutureQueue.js'
import { wait } from '@/Future/wait.js'
import * as Fx from '@/Fx/Fx.js'
import { fiberScoped, managed, scoped } from '@/Fx/scoped.js'

export class Semaphore {
  protected waiting = MutableFutureQueue<never, never, void>()
  protected running = AtomicCounter()

  constructor(readonly maxPermits: NonNegativeInteger) {}

  // Retrieve the number of permits still available
  get available(): NonNegativeInteger {
    return NonNegativeInteger(Math.max(0, this.maxPermits - this.running.get()))
  }

  get acquired(): NonNegativeInteger {
    return this.running.get()
  }

  readonly prepare = Fx.fromLazy(() => {
    if (this.available > 0) {
      return new Acquisition(
        Fx.fromLazy(() => {
          increment(this.running)
        }),
        this.release,
      )
    }

    const [future] = this.waiting.waitFor(1)

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this
    const acquisition = new Acquisition(
      pipe(
        wait(future),
        Fx.tapLazy(() => increment(that.running)),
      ),
      this.release,
    )

    return acquisition
  })

  protected release = Fx.fromLazy(() => {
    decrement(this.running)
    this.waiting.next(Fx.unit)
  })
}

export class Acquisition {
  constructor(readonly acquire: Fx.Of<void>, readonly release: Fx.Of<void>) {}
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
  return pipe(
    semaphore.prepare,
    Fx.flatMap(({ acquire, release }) => managed(acquire, constant(release))),
  )
}

/**
 * Acquire a permit from a given semaphore, run an Fx, and then release the permit.
 */
export function acquire(semaphore: Semaphore) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>) =>
    pipe(
      acquirePermit(semaphore),
      Fx.flatMap(() => fx),
      scoped,
    )
}

/**
 * Acquire a permit from a given semaphore, run an Fx, and then release the permit.
 */
export function acquireFiber(semaphore: Semaphore) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>) =>
    pipe(
      acquirePermit(semaphore),
      Fx.flatMap(() => fx),
      fiberScoped,
    )
}
