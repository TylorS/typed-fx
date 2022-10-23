import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import { periodic } from './periodic.js'
import { collectAll } from './reduce.js'
import { take } from './slice.js'

describe(import.meta.url, () => {
  describe('periodic', () => {
    it('emits a value every period', async () => {
      const test = pipe(periodic(millis(100)), take(3), collectAll)
      const events = await unsafeRunPromise(test)

      deepStrictEqual(events, [undefined, undefined, undefined])
    })
  })
})
