import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { refCountDeferred } from './_internal.js'
import { MapFx } from './map.js'

export function flatMap<A, R2, E2, B, E3>(f: (a: A) => Fx<R2, E2, B, E3>) {
  return <R, E, E1>(self: Fx<R, E, A, E1>): Fx<R | R2, E | E2, B, E1 | E3> => new FlatMapFx(self, f)
}

export class FlatMapFx<R, E, A, E1, R2, E2, B, E3> implements Fx<R2 | R, E | E2, B, E1 | E3> {
  constructor(readonly self: Fx<R, E, A, E1>, readonly f: (a: A) => Fx<R2, E2, B, E3>) {}

  run<R3, E4, C>(sink: Sink<E | E2, B, R3, E4, C>): Effect.Effect<R2 | R | R3, E1 | E3 | E4, C> {
    const { self, f } = this

    return pipe(
      refCountDeferred<E1 | E3 | E4, C>(),
      Effect.flatMap((deferred) =>
        self.run(
          Sink(
            (a) =>
              pipe(
                deferred.increment,
                Effect.zipRight(
                  Effect.fork(
                    f(a).run(
                      Sink(
                        sink.event,
                        flow(sink.error, deferred.error),
                        pipe(
                          deferred.decrement,
                          Effect.flatMap(() => deferred.endIfComplete(sink.end)),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            flow(sink.error, deferred.error, Effect.zipRight(deferred.await)),
            Effect.suspendSucceed(() =>
              pipe(
                deferred.end,
                Effect.flatMap(() => deferred.endIfComplete(sink.end)),
                Effect.zipRight(deferred.await),
              ),
            ),
          ),
        ),
      ),
    )
  }

  static make<R, E, A, E1, R2, E2, B, E3>(
    fx: Fx<R, E, A, E1>,
    f: (a: A) => Fx<R2, E2, B, E3>,
  ): Fx<R | R2, E | E2, B, E1 | E3> {
    if (fx instanceof MapFx) {
      return new FlatMapFx(fx.fx, flow(fx.f, f))
    }

    return new FlatMapFx(fx, f)
  }
}
