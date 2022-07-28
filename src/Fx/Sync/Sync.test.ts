import { deepEqual, deepStrictEqual, ok } from 'assert'

import { isLeft } from 'hkt-ts/Either'

import { Sync, ask, fail } from './Sync.js'
import { runWith } from './run.js'

import * as Cause from '@/Fx/Cause/Cause.js'
import * as Exit from '@/Fx/Exit/Exit.js'

describe(new URL(import.meta.url).pathname, () => {
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

      const failing = runWith(test, 7)

      ok(isLeft(failing))
      ok(failing.left.tag === 'Traced')
      deepEqual(failing.left.cause, new Cause.Failed(error))
    })
  })
})
