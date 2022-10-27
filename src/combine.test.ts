import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe('combine', () => {
    it('combines 2 fx together', async () => {
      const values = [1, 2, 3]
      const test = pipe(
        Fx.fromIterable(values),
        Fx.flatMap((a) =>
          pipe(
            Fx.fromIterable([a, a + 1]),
            Fx.combine(pipe(Fx.fromIterable([a * a, a ** a]), Fx.delay(Duration.millis(10)))),
          ),
        ),
      )
      const events = await pipe(test, Fx.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, [
        [1 + 1, 1 * 1],
        [2 + 1, 2 * 2],
        [3 + 1, 3 * 3],
        [1 + 1, 1 ** 1],
        [2 + 1, 2 ** 2],
        [3 + 1, 3 ** 3],
      ])
    })
  })
})
