import * as TSemaphore from '@effect/core/stm/TSemaphore'
import { flow, pipe } from 'node_modules/@fp-ts/data/Function.js'

import { Push } from './Push.js'
import { flatMap } from './flatMap.js'
import { suspendSucceed } from './suspendSucceed.js'
import { withPermit } from './transform.js'

export function flatMapConcurrently<A, R2, E2, B>(
  concurrency: number,
  f: (a: A) => Push<R2, E2, B>,
) {
  return <R, E>(push: Push<R, E, A>): Push<R | R2, E | E2, B> =>
    suspendSucceed(() =>
      pipe(push, flatMap(flow(f, withPermit(TSemaphore.unsafeMake(concurrency))))),
    )
}

export function concatMap<A, R2, E2, B>(f: (a: A) => Push<R2, E2, B>) {
  return <R, E>(push: Push<R, E, A>): Push<R | R2, E | E2, B> =>
    pipe(push, flatMapConcurrently(1, f))
}
