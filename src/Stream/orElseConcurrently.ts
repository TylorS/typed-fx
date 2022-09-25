import { flow, pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'
import { acquirePermit } from './acquirePermit.js'
import { lazy } from './lazy.js'
import { orElse } from './orElse.js'

import { Cause } from '@/Cause/Cause.js'
import { Semaphore } from '@/Semaphore/index.js'

export function orElseConcurrently<E, R2, E2, B>(
  f: (cause: Cause<E>) => Stream<R2, E2, B>,
  concurrencyLevel: NonNegativeInteger,
  __trace?: string,
) {
  return <R, A>(stream: Stream<R, E, A>) =>
    lazy(() => {
      const semaphore = new Semaphore(concurrencyLevel)

      return pipe(stream, orElse(flow(f, acquirePermit(semaphore)), __trace))
    })
}
