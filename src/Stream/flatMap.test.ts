import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { reduce } from './drain.js'
import { flatMap } from './flatMap.js'
import { from } from './from.js'

describe(import.meta.url, () => {
  describe('flatMap', () => {
    it('allows chaining streams', async () => {
      const program = pipe(
        from([1, 2, 3]),
        flatMap((n) => from([n, n + 1, n + 2])),
        reduce([] as readonly number[], (a, b) => a.concat([b])),
        unsafeRunPromise,
      )

      deepStrictEqual(await program, [1, 2, 3, 2, 3, 4, 3, 4, 5])
    })
  })
})
