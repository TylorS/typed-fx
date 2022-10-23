import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { delay } from './delay.js'
import { flatMap } from './flatMap.js'
import { from } from './from.js'
import { collectAll } from './reduce.js'
import { zip } from './zip.js'

describe(import.meta.url, () => {
  describe('zip', () => {
    it('zips 2 fx together', async () => {
      const values = [1, 2, 3]
      const test = pipe(
        from(values),
        flatMap((a) =>
          pipe(from([a, a + 1]), zip(pipe(from([a * a, a ** a]), delay(Duration.millis(10))))),
        ),
      )
      const events = await pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(events, [
        [values[0] + 1, values[0] * values[0]],
        [values[1] + 1, values[1] * values[1]],
        [values[2] + 1, values[2] * values[2]],
      ])
    })
  })
})
