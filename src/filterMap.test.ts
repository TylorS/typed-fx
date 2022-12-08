import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@tsplus/stdlib/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.map.name, () => {
    it('transform the values of a Fx', async () => {
      const test = pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.map((x) => x ** x),
        Fx.runCollect,
      )

      deepStrictEqual(await Effect.unsafeRunPromise(test), [1, 4, 27])
    })
  })

  describe(Fx.filterMap.name, () => {
    it('transform the values and filters using Maybe of a Fx', async () => {
      const test = pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.filterMap((x) => (x % 2 === 0 ? Maybe.none : Maybe.some(x ** x))),
        Fx.runCollect,
      )

      deepStrictEqual(await Effect.unsafeRunPromise(test), [1, 27])
    })
  })
})
