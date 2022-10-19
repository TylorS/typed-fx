import { deepStrictEqual } from 'assert'

import { unit, unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { reduce } from './drain.js'
import { fromCallback } from './fromCallback.js'

describe(import.meta.url, () => {
  describe('fromCallback', () => {
    it('converts callbacks into a Stream', async () => {
      const effect = pipe(
        fromCallback<never, never, number>(({ event, end }) => {
          event(1)
          event(2)
          event(3)
          end()

          return unit
        }),
        reduce(0, (a, b) => a + b),
      )

      deepStrictEqual(await unsafeRunPromise(effect), 6)
    })
  })
})
