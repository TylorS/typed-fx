import { deepStrictEqual } from 'assert'

import { Effect, Option, pipe } from 'effect'

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
    it('transform the values and filters using Option of a Fx', async () => {
      const test = pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.filterMap((x) => (x % 2 === 0 ? Option.none : Option.some(x ** x))),
        Fx.runCollect,
      )

      deepStrictEqual(await Effect.unsafeRunPromise(test), [1, 27])
    })
  })
})
