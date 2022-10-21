import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { delay } from './delay.js'
import { from } from './from.js'
import { collectAll } from './reduce.js'
import { switchMap } from './switchMap.js'

describe(import.meta.url, () => {
  describe('switchMap', () => {
    it('chains the latest inner stream', async () => {
      const values = [1, 2, 3]
      const test = pipe(
        from(values),
        switchMap((x) => delay(Duration.millis(100))(from([x + 1, x + 2]))),
      )
      const events = await pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(events, [4, 5])
    })
  })
})
