import { deepStrictEqual } from 'assert'

import { collectAll } from './_internal.test.js'
import { fromCallback } from './fromCallback.js'
import { multicast } from './multicast.js'

import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(multicast.name, () => {
    it('effeciently shares underlying stream', async () => {
      let started = 0
      const value = Math.random()
      const stream = multicast(
        fromCallback<never, number>(async ({ event, end }) => {
          started++
          event(value)
          event(value + 1)
          event(value + 2)
          end()
        }),
      )

      const a = collectAll(stream)
      const b = collectAll(stream)

      deepStrictEqual(await a, [value, value + 1, value + 2])
      deepStrictEqual(await b, [value, value + 1, value + 2])
      deepStrictEqual(started, 1)
    })
  })
})
