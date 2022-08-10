import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { observe } from './drain.js'
import { fromFx } from './fromFx.js'

import { Fx, fromLazy, join, runMain, success } from '@/Fx/index.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(fromFx.name, () => {
    it('creates a Stream from an Fx', async () => {
      const stream = fromFx(success(1))

      const test = Fx(function* () {
        const fiber = yield* pipe(
          stream,
          observe((a) => fromLazy(() => deepStrictEqual(a, 1))),
        )

        yield* join(fiber)
      })

      await runMain(test)
    })
  })
})
