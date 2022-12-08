import { deepStrictEqual } from 'assert'

import { Duration, Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.exhaustMapLatest.name, () => {
    it('allows chaining multiple synchronous streams', async () => {
      const result = await pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.exhaustMapLatest((n) => Fx.fromIterable([n, n, n])),
        Fx.runCollect,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 1, 1, 3, 3, 3])
    })

    it('allows chaining multiple asynchronous streams', async () => {
      const result = await pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.exhaustMapLatest((n) => Fx.delay(Duration.millis(10))(Fx.fromIterable([n, n, n]))),
        Fx.runCollect,

        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 1, 1, 3, 3, 3])
    })
  })
})
