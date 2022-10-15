import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts/function'
import { IdentitySum } from 'hkt-ts/number'

import { foldLeft, fromArray } from './Stream.js'
import { flatMap } from './flatMap.js'

import { runMain } from '@/Fx/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(flatMap.name, () => {
    it('allows sequencing streams', async () => {
      const stream = pipe(
        fromArray([1, 2, 3]),
        flatMap((a) => fromArray([a, a + 1])),
      )
      const test = foldLeft(IdentitySum)(stream)

      deepStrictEqual(await runMain(test), 15)
    })
  })
})
