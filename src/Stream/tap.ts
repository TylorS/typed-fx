import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { flatMapFx } from './flatMapFx.js'

import { Fx, fromLazy, map } from '@/Fx/Fx.js'

export const tap =
  <A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>, __trace?: string) =>
  <R, E>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    pipe(
      stream,
      flatMapFx(
        (a) =>
          pipe(
            f(a),
            map(() => a),
          ),
        __trace,
      ),
    )

export const tapLazy = <A, B>(f: (a: A) => B, __trace?: string) =>
  tap((a: A) => fromLazy(() => f(a)), __trace)
