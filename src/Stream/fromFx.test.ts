import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { observe } from './drain'
import { fromFx } from './fromFx'

import { Fx, fromLazy, join, success } from '@/Fx/index'
import { runMain } from '@/Runtime/MainRuntime'

describe(__filename, () => {
  describe(fromFx.name, () => {
    it.only('creates a Stream from an Fx', (done) => {
      const stream = fromFx(success(1))

      const test = Fx(function* () {
        const fiber = yield* pipe(
          stream,
          observe((a) => fromLazy(() => deepStrictEqual(a, 1))),
        )

        yield* join(fiber)
      })

      runMain(test)
        .then(() => done())
        .catch(done)
    })
  })
})
