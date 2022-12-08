import { unsafeMake } from '@effect/stm/TSemaphore'
import { flow, pipe } from 'effect'

import { Fx } from './Fx.js'
import { flatMap } from './flatMap.js'
import { suspendSucceed } from './suspendSucceed.js'
import { withPermit } from './transform.js'

export function flatMapConcurrently<A, R2, E2, B>(concurrency: number, f: (a: A) => Fx<R2, E2, B>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, B> =>
    suspendSucceed(() => pipe(fx, flatMap(flow(f, withPermit(unsafeMake(concurrency))))))
}

export function concatMap<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, B> => pipe(fx, flatMapConcurrently(1, f))
}
