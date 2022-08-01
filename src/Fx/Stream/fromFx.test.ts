import { pipe } from 'hkt-ts'

import { observe } from './drain.js'
import { fromFx } from './fromFx.js'

import { Fx, fromLazy, join, runMain, success } from '@/Fx/index.js'

describe.only(new URL(import.meta.url).pathname, () => {
  describe(fromFx.name, () => {
    it('creates a Stream from an Fx', (done) => {
      const stream = fromFx(success(1))

      const test = Fx(function* () {
        const fiber = yield* pipe(
          stream,
          observe((a) => {
            console.log(a)

            return fromLazy(() => (a === 1 ? done() : done(new Error(`Unexpected value ${a}`))))
          }),
        )

        yield* join(fiber)
      })

      runMain(test)
    })
  })
})
