import { flow, identity, pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'
import { lazy } from './lazy.js'

import * as Fx from '@/Fx/Fx.js'
import { Semaphore, acquire } from '@/Semaphore/Semaphore.js'
import * as Sink from '@/Sink/index.js'

export function flatMapFx<A, R2, E2, B>(f: (a: A) => Fx.Fx<R2, E2, B>, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, B> => {
    return Stream((sink) =>
      stream.fork(
        pipe(sink, Sink.onEvent(flow(f, Fx.matchCause(sink.error, sink.event)), __trace)),
      ),
    )
  }
}

export function joinFx<R, E, R2, E2, A>(stream: Stream<R, E, Fx.Fx<R2, E2, A>>, __trace?: string) {
  return pipe(stream, flatMapFx(identity, __trace))
}

export function flatMapFxConcurrently<A, R2, E2, B>(
  f: (a: A) => Fx.Fx<R2, E2, B>,
  concurrencyLevel: NonNegativeInteger,
  __trace?: string,
) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, B> =>
    lazy<R | R2, E | E2, B>(() => {
      const semaphore = new Semaphore(concurrencyLevel)

      return pipe(
        stream,
        flatMapFx((a) => pipe(a, f, acquire(semaphore)), __trace),
      )
    })
}

export function mergeFxConcurrently(concurrencyLevel: NonNegativeInteger, __trace?: string) {
  return <R, E, R2, E2, A>(stream: Stream<R, E, Fx.Fx<R2, E2, A>>) =>
    pipe(stream, flatMapFxConcurrently(identity, concurrencyLevel, __trace))
}
