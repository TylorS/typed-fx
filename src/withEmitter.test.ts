import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@tsplus/stdlib/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.withEmitter.name, () => {
    it('should allow converting sync callbacks into an Fx', async () => {
      const test = pipe(
        Fx.withEmitter((emitter) => {
          emitter.unsafeEmit(1)
          emitter.unsafeEmit(2)
          emitter.unsafeEmit(3)
          emitter.unsafeEnd()

          return Effect.unit
        }),
        Fx.runCollect,
      )

      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [1, 2, 3])
    })
  })
})
