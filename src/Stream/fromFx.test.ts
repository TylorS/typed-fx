import { pipe } from 'hkt-ts'

import { observe } from './drain'
import { fromFx } from './fromFx'

import { Fx, fromLazy, join, success } from '@/Fx/index'
import { runMain } from '@/Runtime/MainRuntime'

describe(__filename, () => {
  describe(fromFx.name, () => {
    it('creates a Stream from an Fx', (done) => {
      const stream = fromFx(success(1))

      const test = Fx(function* () {
        const fiber = yield* pipe(
          stream,
          observe((a) =>
            fromLazy(() => (a === 1 ? done() : done(new Error(`Unexpected value ${a}`)))),
          ),
        )

        yield* join(fiber)
      })

      runMain(test)
    })
  })
})
