import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.flatMap.name, () => {
    it('allows chaining multiple synchronous streams', async () => {
      const result = await pipe(
        Push.fromIterable([1, 2, 3]),
        Push.flatMap((n) => Push.fromIterable([n, n, n])),
        Push.runCollect,
        Effect.scoped,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 1, 1, 2, 2, 2, 3, 3, 3])
    })

    it('allows chaining multiple asynchronous streams', async () => {
      const result = await pipe(
        Push.fromIterable([1, 2, 3]),
        Push.flatMap((n) => Push.delay(Duration.millis(10))(Push.fromIterable([n, n, n]))),
        Push.runCollect,
        Effect.scoped,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 2, 3, 1, 2, 3, 1, 2, 3])
    })

    it('interrupts inner fibers when they emit their end signal', async () => {
      const result = await pipe(
        Push.fromIterable([1, 2, 3]),
        Push.flatMap((n) =>
          n === 1
            ? Push.take(4)(
                Push.fromIterable([n, n + 10, n + 20, n + 30, n + 40, n + 50, n + 60, n + 70]),
              )
            : Push.fromIterable([n, n, n]),
        ),
        Push.runCollect,
        Effect.scoped,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 11, 21, 31, 2, 2, 2, 3, 3, 3])
    })
  })
})
