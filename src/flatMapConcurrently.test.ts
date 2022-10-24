import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe('flatMapConcurrently', () => {
    it('should run effects with specified concurrency', async () => {
      const test = pipe(
        Fx.mergeAll([Fx.succeed(1), Fx.succeed(2), Fx.succeed(3)]),
        Fx.concatMap((a) => Fx.mergeAll([Fx.succeed(a), Fx.at(millis(50))(a * a)])),
        Fx.collectAll,
      )

      const events = await unsafeRunPromise(test)

      deepStrictEqual(events, [1, 1, 2, 4, 3, 9])
    })
  })
})
