import { deepStrictEqual } from 'assert'

import { Sync, ask, fail } from './Sync'
import { runWith } from './run'

import * as Exit from '@/Exit/Exit'

describe(__filename, () => {
  describe(Sync.name, () => {
    it('allows running sync effects w/ Environment + Failures', () => {
      const error = new Error('foo')
      const test = Sync(function* () {
        const a = yield* ask<number>()
        const b = yield* ask<number>()

        if (a > 5) {
          return yield* fail(error)
        }

        return a + b
      })

      deepStrictEqual(runWith(test, 1), Exit.success(2))
      deepStrictEqual(runWith(test, 7), Exit.failure(error))
    })
  })
})
