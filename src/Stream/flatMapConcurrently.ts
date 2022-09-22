import { flow, pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'
import { acquirePermit } from './acquirePermit.js'
import { flatMap } from './flatMap.js'
import { lazy } from './lazy.js'

import { Semaphore } from '@/Semaphore/index.js'

export function flatMapConcurrently<A, R2, E2, B>(
  f: (a: A) => Stream<R2, E2, B>,
  concurrencyLevel: NonNegativeInteger,
  __trace?: string,
) {
  return <R, E>(stream: Stream<R, E, A>) =>
    lazy(() => {
      const semaphore = new Semaphore(concurrencyLevel)

      return pipe(stream, flatMap(flow(f, acquirePermit(semaphore)), __trace))
    })
}

export function mergeConcurrently(concurrencyLevel: NonNegativeInteger, __trace?: string) {
  return <R, E, R2, E2, A>(stream: Stream<R, E, Stream<R2, E2, A>>) =>
    pipe(
      stream,
      flatMapConcurrently((a) => a, concurrencyLevel, __trace),
    )
}

export function concatMap<A, R2, E2, B>(f: (a: A) => Stream<R2, E2, B>, __trace?: string) {
  return flow(flatMapConcurrently(f, NonNegativeInteger(1), __trace))
}
