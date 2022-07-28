import { deepEqual, deepStrictEqual, ok } from 'assert'

import { isLeft } from 'hkt-ts/Either'

import { Env } from './Env.js'
import { Sync, ask, fail } from './Sync.js'
import { runWith } from './run.js'

import * as Cause from '@/Fx/Cause/Cause.js'
import * as Exit from '@/Fx/Exit/Exit.js'
import { Service } from '@/Service/index.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(Sync.name, () => {
    it('allows running sync effects w/ Environment + Failures', () => {
      const Foo = Service<number>('Foo')
      const error = new Error('foo')
      const test = Sync(function* () {
        const a = yield* ask(Foo)
        const b = yield* ask(Foo)

        if (a > 5) {
          return yield* fail(error)
        }

        return a + b
      })

      deepStrictEqual(runWith(test, Env(Foo, 1)), Exit.success(2))

      const failing = runWith(test, Env(Foo, 7))

      ok(isLeft(failing))
      ok(failing.left.tag === 'Traced')
      deepEqual(failing.left.cause, new Cause.Failed(error))
    })
  })
})
