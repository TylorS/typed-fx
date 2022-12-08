import { deepStrictEqual } from 'assert'

import { Duration, Effect, pipe } from 'effect'

import { periodic } from './periodic.js'
import { runCollect } from './runCollect.js'
import { take } from './slice.js'

describe(import.meta.url, () => {
  describe('periodic', () => {
    it('emits a value every period', async () => {
      const test = pipe(periodic(Duration.millis(100)), take(3), runCollect, Effect.scoped)
      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [undefined, undefined, undefined])
    })
  })
})
