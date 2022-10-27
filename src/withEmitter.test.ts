import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.withEmitter.name, () => {
    it('should allow converting sync callbacks into an Fx', async () => {
      const test = pipe(
        Fx.withEmitter((emitter) => {
          emitter.emit(1)
          emitter.emit(2)
          emitter.emit(3)
          emitter.end()

          return Effect.unit
        }),
        Fx.runCollect,
      )

      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [1, 2, 3])
    })
  })
})
