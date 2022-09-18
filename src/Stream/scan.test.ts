import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collectAll } from './_internal.test.js'
import { continueWith } from './continueWith.js'
import { flatMap } from './flatMap.js'
import { now } from './fromFx.js'
import { scan } from './scan.js'

import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(scan.name, () => {
    const stream = pipe(
      now(1),
      continueWith(() => now(2)),
      flatMap((n) => now(n + 1)),
      scan((acc, n) => acc + n, 0),
    )

    it('accumulates values', async () => {
      const values = await collectAll(stream)

      deepStrictEqual(values, [2, 5])
    })
  })
})
