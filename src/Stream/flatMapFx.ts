import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'
import { flatMap } from './flatMap.js'
import { flatMapConcurrently } from './flatMapConcurrently.js'
import { fromFx } from './fromFx.js'

import { Fx } from '@/Fx/Fx.js'

export function flatMapFx<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, B> =>
    pipe(
      stream,
      flatMap((a) => fromFx(f(a), __trace), __trace),
    )
}

export function joinFx<R, E, A>(stream: Stream<R, E, Fx<R, E, A>>, __trace?: string) {
  return pipe(
    stream,
    flatMapFx((x) => x, __trace),
  )
}

export function flatMapFxConcurrently<A, R2, E2, B>(
  f: (a: A) => Fx<R2, E2, B>,
  concurrencyLevel: NonNegativeInteger,
  __trace?: string,
) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, B> =>
    pipe(
      stream,
      flatMapConcurrently((a) => fromFx(f(a), __trace), concurrencyLevel, __trace),
    )
}

export function mergeFxConcurrently(concurrencyLevel: NonNegativeInteger, __trace?: string) {
  return <R, E, R2, E2, A>(stream: Stream<R, E, Fx<R2, E2, A>>) => {
    return pipe(
      stream,
      flatMapFxConcurrently((x) => x, concurrencyLevel, __trace),
    )
  }
}
