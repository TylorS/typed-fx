import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { millis } from '@tsplus/stdlib/data/Duration'
import { pipe } from '@tsplus/stdlib/data/Function'

import { periodic } from './periodic.js'
import { runCollect } from './runCollect.js'
import { take } from './slice.js'

describe(import.meta.url, () => {
  describe('periodic', () => {
    it('emits a value every period', async () => {
      const test = pipe(periodic(millis(100)), take(3), runCollect, Effect.scoped)
      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [undefined, undefined, undefined])
    })
  })
})
