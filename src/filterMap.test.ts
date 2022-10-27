import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.map.name, () => {
    it('transform the values of a Push', async () => {
      const test = pipe(
        Push.fromIterable([1, 2, 3]),
        Push.map((x) => x ** x),
        Push.runCollect,
      )

      deepStrictEqual(await Effect.unsafeRunPromise(test), [1, 4, 27])
    })
  })

  describe(Push.filterMap.name, () => {
    it('transform the values and filters using Maybe of a Push', async () => {
      const test = pipe(
        Push.fromIterable([1, 2, 3]),
        Push.filterMap((x) => (x % 2 === 0 ? Maybe.none : Maybe.some(x ** x))),
        Push.runCollect,
      )

      deepStrictEqual(await Effect.unsafeRunPromise(test), [1, 27])
    })
  })
})
