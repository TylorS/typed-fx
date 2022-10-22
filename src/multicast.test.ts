import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { delay } from './delay.js'
import { flatMap } from './flatMap.js'
import { from } from './from.js'
import { merge } from './merge.js'
import { multicast } from './multicast.js'
import { collectAll } from './reduce.js'
import { suspendSucceed } from './suspendSucceed.js'

describe(import.meta.url, () => {
  describe('multicast', () => {
    it('should not change the underlying stream', async () => {
      const values = [1, 2, 3]
      let started = 0
      const test = pipe(
        suspendSucceed(() => {
          started++
          return pipe(
            from(values),
            flatMap((a) =>
              pipe(
                from([a, a + 1]),
                merge(pipe(from([a * a, a ** a]), delay(Duration.millis(50)))),
              ),
            ),
          )
        }),
        multicast,
      )
      const events = pipe(test, collectAll, unsafeRunPromise)
      const events2 = pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(await events, [
        values[0],
        values[0] + 1,
        values[1],
        values[1] + 1,
        values[2],
        values[2] + 1,
        values[0] * values[0],
        values[1] * values[1],
        values[2] * values[2],
        values[0] ** values[0],
        values[1] ** values[1],
        values[2] ** values[2],
      ])

      deepStrictEqual(await events, await events2)

      deepStrictEqual(started, 1)
    })
  })
})
