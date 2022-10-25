import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'
import * as Duration from '@tsplus/stdlib/data/Duration'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe('multicast', () => {
    it('should not change the underlying stream', async () => {
      const values = [1, 2, 3]
      let started = 0
      const test = pipe(
        Push.suspendSucceed(() => {
          started++
          return pipe(
            Push.fromIterable(values),
            Push.flatMap((a) =>
              pipe(
                Push.fromIterable([a, a + 1]),
                Push.merge(
                  pipe(Push.fromIterable([a * a, a ** a]), Push.delay(Duration.millis(50))),
                ),
              ),
            ),
          )
        }),
        Push.multicast,
      )
      const events = pipe(test, Push.runCollect, unsafeRunPromise)
      const events2 = pipe(test, Push.runCollect, unsafeRunPromise)

      deepStrictEqual(
        await events,
        Chunk.from([1, 1 + 1, 2, 2 + 1, 3, 3 + 1, 1 * 1, 2 * 2, 3 * 3, 1 ** 1, 2 ** 2, 3 ** 3]),
      )

      deepStrictEqual(await events, await events2)

      deepStrictEqual(started, 1)
    })
  })
})
