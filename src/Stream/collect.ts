import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'
import { observe } from './drain.js'

import * as Fiber from '@/Fiber/index.js'
import { Fx, fromLazy, join } from '@/Fx/Fx.js'

export const collect = <R, E, A>(stream: Stream<R, E, A>): Fx<R, E, readonly A[]> =>
  Fx(function* () {
    const values: A[] = []

    return yield* pipe(
      yield* pipe(
        stream,
        observe((a) => fromLazy(() => values.push(a))),
      ),
      Fiber.map(() => values),
      join,
    )
  })
