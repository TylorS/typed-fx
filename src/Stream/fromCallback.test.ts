import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { observe } from './drain.js'
import { fromCallback } from './fromCallback.js'

import { Fx, fromLazy, join, runMain, unit } from '@/Fx/index.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(fromCallback.name, () => {
    it('creates a Stream from an Fx', async () => {
      const stream = fromCallback<number>((event, _, end) => {
        event(1)
        end()

        return () => unit
      })

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
