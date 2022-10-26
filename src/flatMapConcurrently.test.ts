import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe('flatMapConcurrently', () => {
    it('should run effects with specified concurrency', async () => {
      const test = pipe(
        Push.mergeAll([Push.succeed(1), Push.succeed(2), Push.succeed(3)]),
        Push.concatMap((a) =>
          Push.mergeAll([Push.succeed(a), Push.at(Duration.millis(50))(a * a)]),
        ),
        Push.runCollect,
        Effect.scoped,
      )

      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [1, 1, 2, 4, 3, 9])
    })
  })
})
