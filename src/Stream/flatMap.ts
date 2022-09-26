import { flow, pipe } from 'hkt-ts'

import { Stream } from './Stream.js'
import { MapStream } from './bimap.js'

import * as Fx from '@/Fx/index.js'
import * as Sink from '@/Sink/index.js'

export function flatMap<A, R2, E2, B>(
  f: (a: A) => Stream<R2, E2, B>,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R | R2, E | E2, B> {
  return (stream) => makeFlatMap(stream, f, __trace)
}

export function join<R, E, R2, E2, A>(
  stream: Stream<R, E, Stream<R2, E2, A>>,
  __trace?: string,
): Stream<R | R2, E | E2, A> {
  return flatMap((a: Stream<R2, E2, A>) => a, __trace)(stream)
}

function makeFlatMap<R, E, A, R2, E2, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => Stream<R2, E2, B>,
  __trace?: string,
): Stream<R | R2, E | E2, B> {
  if (stream instanceof MapStream) {
    return makeFlatMap(stream.stream, flow(stream.f, f), __trace)
  }

  return Stream((sink) => {
    let running = 0
    let ended = false

    const endIfCompleted = Fx.lazy(() => {
      if (ended && running === 0) {
        return sink.end
      }

      return Fx.unit
    })

    return stream.fork(
      pipe(
        sink,
        Sink.onEnd(
          Fx.lazy(() => {
            ended = true

            return endIfCompleted
          }),
        ),
        Sink.onEvent(
          (a: A) =>
            Fx.lazy(() => {
              running++

              return f(a).fork(
                pipe(
                  sink,
                  Sink.onEnd(
                    Fx.lazy(() => {
                      running--

                      return endIfCompleted
                    }),
                  ),
                ),
              )
            }),
          __trace,
        ),
      ),
    )
  })
}
