import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { collectAll } from './drain.js'
import { periodic } from './periodic.js'
import { take } from './slice.js'

describe(import.meta.url, () => {
  describe('periodic', () => {
    it('emits value at a given interval forever', async () => {
      const delay = Duration.millis(10)
      const iterations = Math.floor(Math.random() * 10)
      const stream = pipe(periodic(delay), take(iterations))
      const result = await unsafeRunPromise(collectAll(stream))

      deepStrictEqual(result, Array(iterations).fill(undefined))
    })
  })
})
