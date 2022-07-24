import { deepStrictEqual } from 'assert'

import { Sync, ask, fail } from './Sync'
import { run } from './run'

import * as Exit from '@/Fx/Exit/Exit'

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

      deepStrictEqual(run(test, 1), Exit.success(2))
      deepStrictEqual(run(test, 7), Exit.failure(error))
    })
  })
})
