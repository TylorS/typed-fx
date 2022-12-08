import { deepStrictEqual } from 'assert'

import { Duration, Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe('flatMapConcurrently', () => {
    it('should run effects with specified concurrency', async () => {
      const test = pipe(
        Fx.mergeAll([Fx.succeed(1), Fx.succeed(2), Fx.succeed(3)]),
        Fx.concatMap((a) => Fx.mergeAll([Fx.succeed(a), Fx.at(Duration.millis(50))(a * a)])),
        Fx.runCollect,
      )

      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [1, 1, 2, 4, 3, 9])
    })
  })
})
