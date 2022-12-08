import { deepStrictEqual } from 'assert'

import { Duration, Effect, Fiber, pipe } from 'effect'

import { TestEnvironment, adjust } from './_internal.test.js'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.since.name, () => {
    it('runs a stream since a signal is emitted to stop', async () => {
      const sut = Effect.gen(function* ($) {
        const fiber = yield* $(
          pipe(
            Fx.periodic(Duration.millis(10)),
            Fx.scan(0, (x) => x + 1),
            Fx.since(Fx.at(Duration.millis(100))(null)),
            Fx.take(5),
            Fx.runCollect,
            Effect.fork,
          ),
        )

        for (let i = 0; i < 15; i++) {
          yield* $(adjust(Duration.millis(10)))
        }

        return yield* $(Fiber.join(fiber))
      })

      const test = pipe(sut, Effect.provideLayer(TestEnvironment))
      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [11, 12, 13, 14, 15])
    })
  })
})
