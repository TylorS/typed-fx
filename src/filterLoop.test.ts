import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.loop.name, () => {
    it('tracks state and atomically computing a value', async () => {
      const values = ['foo', 'bar', 'baz', 'quux']
      const test = pipe(
        Push.fromIterable(values),
        Push.loop(1, (a, b) => [a + b.length, a]),
      )
      const events = await pipe(test, Push.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, [1, 4, 7, 10])
    })
  })

  describe(Push.scan.name, () => {
    it('emits seed value and tracks applies a reducer to events and accumulator', async () => {
      const values = ['foo', 'bar', 'baz', 'quux']
      const test = pipe(
        Push.fromIterable(values),
        Push.scan(1, (a, b) => a + b.length),
      )
      const events = await pipe(test, Push.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, [1, 4, 7, 10, 14])
    })
  })

  describe(Push.filterLoop.name, () => {
    it('tracks state and atomically computing a value, using Maybe for filtering', async () => {
      const values = ['foo', 'bar', 'baz', 'quux']
      const test = pipe(
        Push.fromIterable(values),
        Push.filterLoop(1, (a, b) =>
          b.startsWith('b') ? Maybe.some([a + b.length, a]) : Maybe.none,
        ),
      )
      const events = await pipe(test, Push.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, [1, 4])
    })
  })

  describe(Push.filterScan.name, () => {
    it('emits seed value and tracks applies a reducer to events and accumulator, using Maybe for filtering', async () => {
      const values = ['foo', 'bar', 'baz', 'quux']
      const test = pipe(
        Push.fromIterable(values),
        Push.filterScan(1, (a, b) => (b.startsWith('b') ? Maybe.some(a + b.length) : Maybe.none)),
      )
      const events = await pipe(test, Push.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, [1, 4, 7])
    })
  })
})
