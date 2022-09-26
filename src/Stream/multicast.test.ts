import { deepStrictEqual } from 'assert'

import { collectAll } from './_internal.test.js'
import { fromLazy } from './fromFx.js'
import { multicast } from './multicast.js'

import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(multicast.name, () => {
    it('effeciently shares underlying stream', async () => {
      let started = 0
      const value = Math.random()
      const stream = multicast(
        fromLazy(() => {
          started++

          return value
        }),
      )

      const a = collectAll(stream)
      const b = collectAll(stream)

      deepStrictEqual(await a, [value])
      deepStrictEqual(await b, [value])
      deepStrictEqual(started, 1)
    })
  })
})
