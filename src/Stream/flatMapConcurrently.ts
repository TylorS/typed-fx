import * as TSemaphore from '@effect/core/stm/TSemaphore'
import { flow, pipe } from '@fp-ts/data/Function'

import { Stream, suspendSucceed } from './Stream.js'
import { acquirePermit } from './acquirePermit.js'
import { flatMap } from './flatMap.js'

export function flatMapConcurrently<A, R2, E2, B, E3>(
  n: number,
  f: (a: A) => Stream<R2, E2, B, E3>,
) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R | R2, E | E2, B, E1 | E3> =>
    suspendSucceed(() => pipe(stream, flatMap(flow(f, acquirePermit(TSemaphore.unsafeMake(n))))))
}
