import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'
import { now } from './fromFx.js'

import * as Fx from '@/Fx/index.js'
import * as Sink from '@/Sink/index.js'

export function continueWith<R2, E2, B>(f: () => Stream<R2, E2, B>, __trace?: string) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, A | B> =>
    Stream((sink) =>
      stream.fork(
        pipe(
          sink,
          Sink.onEnd(
            Fx.lazy(() => f().fork(sink)),
            __trace,
          ),
        ),
      ),
    )
}

export const startWith =
  <B>(value: B, __trace?: string) =>
  <R, E, A>(stream: Stream<R, E, A>) =>
    pipe(
      now(value),
      continueWith(() => stream, __trace),
    )
