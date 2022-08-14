import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'
import { withTransform } from './withTransform.js'

import { Semaphore, acquireFiber } from '@/Semaphore/Semaphore.js'

export const withConcurrency =
  (concurrencyLevel: NonNegativeInteger) =>
  <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> =>
    pipe(stream, withTransform(acquireFiber(new Semaphore(concurrencyLevel))))
