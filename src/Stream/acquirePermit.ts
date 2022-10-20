import * as Effect from '@effect/core/io/Effect'
import * as Scope from '@effect/core/io/Scope'
import { TSemaphore, withPermitScoped } from '@effect/core/stm/TSemaphore'
import { pipe } from '@fp-ts/data/Function'
import { fail, succeed } from 'node_modules/@effect/core/io/Exit.js'
import { Fiber } from 'node_modules/@effect/core/io/Fiber.js'

import { Stream } from './Stream.js'

import { Sink } from '@/Sink/Sink.js'

export function acquirePermit(sempahore: TSemaphore) {
  return <R, E, A, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, A, E1> =>
    Stream(
      <R3, E3, B>(sink: Sink<E, A, R3, E3, B>): Effect.Effect<R | R3, never, Fiber<E1 | E3, B>> =>
        pipe(
          Scope.make,
          Effect.flatMap((scope) =>
            pipe(
              sempahore,
              withPermitScoped,
              Effect.flatMap(() =>
                stream.fork(
                  Sink(
                    sink.event,
                    (e) =>
                      pipe(
                        e,
                        sink.error,
                        Effect.tap(() => pipe(scope, Scope.close(fail(e)))),
                      ),
                    pipe(
                      sink.end,
                      Effect.tap((a) => pipe(scope, Scope.close(succeed(a)))),
                    ),
                  ),
                ),
              ),
              Effect.provideService(Scope.Scope.Tag, scope),
            ),
          ),
        ),
    )
}
