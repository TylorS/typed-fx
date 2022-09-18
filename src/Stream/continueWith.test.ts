import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collectAll } from './_internal.test.js'
import { continueWith } from './continueWith.js'
import { now } from './fromFx.js'

import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(continueWith.name, () => {
    const stream = pipe(
      now(1),
      continueWith(() => now(2)),
    )
    it('should continue with the provided stream', async () => {
      const events = await collectAll(stream)

      deepStrictEqual(events, [1, 2])
    })
  })
})
