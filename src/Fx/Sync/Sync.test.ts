import { deepEqual, deepStrictEqual, ok } from 'assert'

import { isLeft } from 'hkt-ts/Either'

import { Debug } from '../Trace/Trace'

import { Sync, ask, fail } from './Sync'
import { runWith } from './run'

import * as Cause from '@/Fx/Cause/Cause'
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

      deepStrictEqual(runWith(test, 1), Exit.success(2))

      const failing = runWith(test, 7)

      ok(isLeft(failing))
      ok(failing.left.tag === 'Traced')
      console.log(Debug.debug(failing.left.trace))
      deepEqual(failing.left.cause, new Cause.Failed(error))
    })
  })
})
