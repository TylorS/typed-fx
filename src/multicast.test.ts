import { deepStrictEqual } from 'assert'

import { Duration, Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe('multicast', () => {
    it('should not change the underlying stream', async () => {
      const values = [1, 2, 3]
      let started = 0
      const test = pipe(
        Fx.suspendSucceed(() => {
          started++
          return pipe(
            Fx.fromIterable(values),
            Fx.flatMap((a) =>
              pipe(
                Fx.fromIterable([a, a + 1]),
                Fx.merge(pipe(Fx.fromIterable([a * a, a ** a]), Fx.delay(Duration.millis(50)))),
              ),
            ),
          )
        }),
        Fx.multicast,
      )
      const events = pipe(test, Fx.runCollect, Effect.unsafeRunPromise)
      const events2 = pipe(test, Fx.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(await events, [
        1,
        1 + 1,
        2,
        2 + 1,
        3,
        3 + 1,
        1 * 1,
        2 * 2,
        3 * 3,
        1 ** 1,
        2 ** 2,
        3 ** 3,
      ])

      deepStrictEqual(await events, await events2)

      deepStrictEqual(started, 1)
    })
  })
})
