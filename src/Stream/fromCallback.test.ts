import { deepStrictEqual } from 'assert'

import { collectAll } from './_internal.test.js'
import { fromCallback } from './fromCallback.js'

import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(fromCallback.name, () => {
    const value = Math.random()
    const stream = fromCallback<never, number>(async ({ event, end }) => {
      await event(value)
      await event(value + 1)
      await event(value + 2)
      await end()
    })

    it('is collectable', async () => {
      deepStrictEqual(await collectAll(stream), [value, value + 1, value + 2])
    })
  })
})
