import * as TSemaphore from '@effect/core/stm/TSemaphore'
import { flow, pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { withPermit } from './TSemaphore.js'
import { flatMap } from './flatMap.js'
import { suspendSucceed } from './suspendSucceed.js'

export function flatMapConcurrently<A, R2, E2, B, E3>(
  concurrency: number,
  f: (a: A) => Fx<R2, E2, B, E3>,
) {
  return <R, E, E1>(self: Fx<R, E, A, E1>): Fx<R | R2, E | E2, B, E1 | E3> =>
    suspendSucceed(() =>
      pipe(self, flatMap(flow(f, withPermit(TSemaphore.unsafeMake(concurrency))))),
    )
}

export function concatMap<A, R2, E2, B, E3>(f: (a: A) => Fx<R2, E2, B, E3>) {
  return <R, E, E1>(self: Fx<R, E, A, E1>): Fx<R | R2, E | E2, B, E1 | E3> =>
    pipe(self, flatMapConcurrently(1, f))
}
