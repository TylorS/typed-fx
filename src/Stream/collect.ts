import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'
import { observe } from './drain.js'

import { Fiber } from '@/Fiber/index.js'
import { Fx, fromLazy, join } from '@/Fx/Fx.js'

export const collect = <R, E, A>(stream: Stream<R, E, A>): Fx<R, E, readonly A[]> =>
  Fx(function* () {
    const values: A[] = []

    const fiber: Fiber<E, unknown> = yield* pipe(
      stream,
      observe((a) => fromLazy(() => values.push(a))),
    )

    yield* join(fiber)

    return values
  })