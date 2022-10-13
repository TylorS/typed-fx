import { pipe } from 'hkt-ts'
import { Maybe } from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { AtomicCounter } from '@/Atomic/AtomicCounter.js'
import type { FiberRef } from '@/FiberRef/FiberRef.js'
import { Future, Pending } from '@/Future/Future.js'
import { complete } from '@/Future/complete.js'
import { wait } from '@/Future/wait.js'
import * as Fx from '@/Fx/Fx.js'
import { Scope } from '@/Scope/Scope.js'

export interface Semaphore<R, E, A> {
  readonly maxPermits: NonNegativeInteger
  readonly acquiredPermits: Fx.Fx.Of<NonNegativeInteger>
  readonly remainingPermits: Fx.Fx.Of<NonNegativeInteger>
  readonly acquirePermits: (permits: NonNegativeInteger) => Fx.Fx<R | Scope, E, A>
  readonly refresh: Fx.Fx<R, E, Maybe<A>>
}

export function Semaphore<R, E, A>(
  ref: FiberRef<R, E, A>,
  maxPermits: NonNegativeInteger,
): Semaphore<R, E, A> {
  const waiting: Array<[requested: NonNegativeInteger, future: Future<R | Scope, E, A>]> = []
  const acquiredPermits = AtomicCounter()
  const remainingPermits = () => NonNegativeInteger(Math.max(0, maxPermits - acquiredPermits.get()))

  const release = (permits: NonNegativeInteger) =>
    Fx.fromLazy(() => {
      acquiredPermits.set(NonNegativeInteger(Math.max(0, acquiredPermits.get() - permits)))

      if (waiting.length > 0 && waiting[0][0] <= remainingPermits()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [permits, future] = waiting.shift()!
        complete(future)(acquire(permits))
      }
    })

  const acquire = (requestedPermits: NonNegativeInteger) =>
    pipe(
      Fx.ask(Scope),
      Fx.tapLazy((scope) => {
        acquiredPermits.set(NonNegativeInteger(acquiredPermits.get() + requestedPermits))
        scope.ensuring(() => release(requestedPermits))
      }),
      Fx.flatMap(() => Fx.getFiberRef(ref)),
    )

  const semaphore: Semaphore<R, E, A> = {
    maxPermits,
    acquiredPermits: Fx.fromLazy(acquiredPermits.get),
    remainingPermits: Fx.fromLazy(remainingPermits),
    acquirePermits: (permits) =>
      Fx.lazy(() => {
        const requestedPermits = NonNegativeInteger(Math.min(permits, maxPermits)) // Cannot request more than maxPermits

        if (remainingPermits() >= requestedPermits) {
          return acquire(requestedPermits)
        }

        const future = Pending<R | Scope, E, A>()

        waiting.push([requestedPermits, future])

        return wait(future)
      }),
    refresh: Fx.deleteFiberRef(ref),
  }

  return semaphore
}

const one = NonNegativeInteger(1)

export function Lock<R, E, A>(ref: FiberRef<R, E, A>) {
  return Semaphore(ref, one)
}
