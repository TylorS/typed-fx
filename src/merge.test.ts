import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { at, delay } from './delay.js'
import { flatMap } from './flatMap.js'
import { from } from './from.js'
import { succeed } from './fromEffect.js'
import { merge, mergeAll } from './merge.js'
import { collectAll } from './reduce.js'

describe(import.meta.url, () => {
  describe('merge', () => {
    it('merges 2 fx together', async () => {
      const values = [1, 2, 3]
      const test = pipe(
        from(values),
        flatMap((a) =>
          pipe(from([a, a + 1]), merge(pipe(from([a * a, a ** a]), delay(Duration.millis(10))))),
        ),
      )
      const events = await pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(events, [
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
    })

    it('merges many Fx together', async () => {
      const values = Array.from({ length: 100 }, (_, i) => i)
      const test = mergeAll(values.map((a) => succeed(a)))
      const events = await pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(events, values)
    })

    it('merges async values', async () => {
      const values = Array.from({ length: 100 }, (_, i) => i)
      const test = mergeAll(values.map((a, i) => at(Duration.millis(i as any))(a)))
      const events = await pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(events, values)
    })

    it('merges sync and async values', async () => {
      const values = Array.from({ length: 100 }, (_, i) => i)
      const test = mergeAll(
        values.map((a, i) => (i % 2 === 0 ? succeed(a) : at(Duration.millis(i as any))(a))),
      )
      const events = await pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(events, [
        ...values.filter((_, i) => i % 2 === 0),
        ...values.filter((_, i) => i % 2 !== 0),
      ])
    })
  })
})
