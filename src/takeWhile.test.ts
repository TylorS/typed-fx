import { deepStrictEqual } from 'assert'

import { Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.takeWhile.name, () => {
    it('provides a service to the Fx', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Fx.fromIterable([1, 2, 3, 4, 5, 6, 7]),
            Fx.takeWhile((x) => x < 4),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [1, 2, 3])
      })

      await Effect.unsafeRunPromise(test)
    })
  })

  describe(Fx.takeUntil.name, () => {
    it('provides a service to the Fx', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Fx.fromIterable([1, 2, 3, 4, 5, 6, 7]),
            Fx.takeUntil((x) => x > 3),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [1, 2, 3])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
