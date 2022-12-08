import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as TestClock from '@effect/core/testing/TestClock'
import { TestEnvironment } from '@effect/core/testing/TestEnvironment'
import { millis } from '@tsplus/stdlib/data/Duration'
import { pipe } from '@tsplus/stdlib/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.until.name, () => {
    it('runs a stream until a signal is emitted to stop', async () => {
      const fx = pipe(Fx.periodic(millis(20)), Fx.until(Fx.at(millis(200))(null)))

      const test = pipe(
        Effect.gen(function* ($) {
          const fiber = yield* $(pipe(fx, Fx.runCollect, Effect.fork))

          for (let i = 0; i < 20; i++) {
            yield* $(TestClock.adjust(millis(10)))
          }

          return yield* $(Fiber.join(fiber))
        }),
        Effect.provideLayer(TestEnvironment),
      )

      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events.length, 10)
    })
  })
})
