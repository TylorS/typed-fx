import { flow, pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { flatMap } from './flatMap.js'
import { makeFromFx } from './fromFx.js'

import { Fx } from '@/Fx/Fx.js'

export function flatMapFx<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>, span = 'Stream.flatMapFx') {
  return <R, E>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, B> =>
    pipe(stream, flatMap(flow(f, makeFromFx(span))))
}
