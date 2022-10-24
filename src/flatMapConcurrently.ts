import * as TSemaphore from '@effect/core/stm/TSemaphore'
import { flow, pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { withPermit } from './TSemaphore.js'
import { flatMap } from './flatMap.js'
import { suspendSucceed } from './suspendSucceed.js'
import { uninterruptible } from './transform.js'

export function flatMapConcurrently<A, R2, E2, B, E3>(
  concurrency: number,
  f: (a: A) => Fx<R2, E2, B, E3>,
) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, B, E1 | E3> =>
    suspendSucceed(() =>
      // TODO: This seems like some kind of bug, but uninterruptable makes the tests pass
      pipe(fx, flatMap(flow(f, withPermit(TSemaphore.unsafeMake(concurrency)), uninterruptible))),
    )
}

export function concatMap<A, R2, E2, B, E3>(f: (a: A) => Fx<R2, E2, B, E3>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, B, E1 | E3> =>
    pipe(fx, flatMapConcurrently(1, f))
}
