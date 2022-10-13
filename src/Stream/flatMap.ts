import { pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/Cause.js'
import * as Fiber from '@/Fiber/index.js'
import * as FiberId from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/index.js'
import { closeOrWait, wait } from '@/Scope/Closeable.js'
import { Sink } from '@/Sink/Sink.js'

export function flatMap<A, R2, E2, B>(f: (a: A) => Stream<R2, E2, B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R | R2, E, B, E1 | E2> => {
    return Stream(<R3, E3, C>(sink: Sink<E, B, R3, E3, C>) =>
      pipe(
        Fx.getPlatform,
        Fx.bindTo('platform'),
        Fx.bind('fiberRefs', () => Fx.getFiberRefs),
        Fx.bind('scope', () =>
          pipe(
            Fx.getFiberScope,
            Fx.map((s) => s.fork()),
          ),
        ),
        Fx.bind('fiber', ({ scope }) =>
          Fx.lazy(() => {
            let ended = false
            let running = 0

            const closeIfComplete: Fx.Fx<R3, E1 | E2 | E3, C> = pipe(
              Fx.lazy(() => {
                if (ended && running === 0) {
                  return pipe(
                    sink.end,
                    Fx.flatMap((a) => closeOrWait(scope)(Right(a))),
                  )
                }

                return wait(scope)
              }),
              Fx.flatMap(Fx.fromExit),
            )

            const error = (c: Cause<E | E2>): Fx.IO<E1 | E2 | E3, C> =>
              pipe(
                Fx.lazy(() => {
                  ended = true

                  return closeOrWait(scope)(Left(c))
                }),
                Fx.flatMap(Fx.fromExit),
              )

            return stream.fork<R2 | R3, E1 | E2 | E3, C>({
              event: (a) =>
                Fx.lazy(() => {
                  running++

                  return f(a).fork<R3, E3 | E2 | E1, unknown>({
                    event: sink.event,
                    error,
                    end: Fx.lazy(() => {
                      running--

                      return Fx.forkSync(closeIfComplete)
                    }),
                  })
                }),
              error,
              end: Fx.lazy(() => {
                ended = true
                return closeIfComplete
              }),
            })
          }),
        ),
        Fx.map(({ platform, fiberRefs, scope, fiber }) =>
          pipe(
            Fiber.fromScope<E1 | E2 | E3, C>(FiberId.Live(platform), fiberRefs.fork(), scope),
            Fiber.orElse<E1 | E2 | E3, C>(() => fiber),
          ),
        ),
      ),
    )
  }
}
