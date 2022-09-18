import { flow, pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { flatMap } from './flatMap.js'
import { fromFx } from './fromFx.js'

import { Fx } from '@/Fx/Fx.js'

export function flatMapFx<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, B> =>
    pipe(
      stream,
      flatMap(
        flow(f, (x) => fromFx(x, __trace)),
        __trace,
      ),
    )
}
