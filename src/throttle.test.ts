import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { millis } from '@tsplus/stdlib/data/Duration'
import { pipe } from '@tsplus/stdlib/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.throttle.name, () => {
    it('favors the first overlapping event', async () => {
      const test = pipe(Fx.fromIterable([1, 2, 3]), Fx.throttle(millis(100)), Fx.runCollect)

      deepStrictEqual(await Effect.unsafeRunPromise(test), [1])
    })
  })
})
