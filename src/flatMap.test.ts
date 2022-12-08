import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import * as Duration from '@tsplus/stdlib/data/Duration'
import { pipe } from '@tsplus/stdlib/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.flatMap.name, () => {
    it('allows chaining multiple synchronous streams', async () => {
      const result = await pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.flatMap((n) => Fx.fromIterable([n, n, n])),
        Fx.runCollect,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 1, 1, 2, 2, 2, 3, 3, 3])
    })

    it('allows chaining multiple asynchronous streams', async () => {
      const result = await pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.flatMap((n) => Fx.delay(Duration.millis(10))(Fx.fromIterable([n, n, n]))),
        Fx.runCollect,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 2, 3, 1, 2, 3, 1, 2, 3])
    })

    it('interrupts inner fibers when they emit their end signal', async () => {
      const result = await pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.flatMap((n) =>
          n === 1
            ? Fx.take(4)(
                Fx.fromIterable([n, n + 10, n + 20, n + 30, n + 40, n + 50, n + 60, n + 70]),
              )
            : Fx.fromIterable([n, n, n]),
        ),
        Fx.runCollect,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 11, 21, 31, 2, 2, 2, 3, 3, 3])
    })
  })
})
