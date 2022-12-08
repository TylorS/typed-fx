import { deepStrictEqual } from 'assert'

import { Effect, Option, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.loop.name, () => {
    it('tracks state and atomically computing a value', async () => {
      const values = ['foo', 'bar', 'baz', 'quux']
      const test = pipe(
        Fx.fromIterable(values),
        Fx.loop(1, (a, b) => [a + b.length, a]),
      )
      const events = await pipe(test, Fx.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, [1, 4, 7, 10])
    })
  })

  describe(Fx.scan.name, () => {
    it('emits seed value and tracks applies a reducer to events and accumulator', async () => {
      const values = ['foo', 'bar', 'baz', 'quux']
      const test = pipe(
        Fx.fromIterable(values),
        Fx.scan(1, (a, b) => a + b.length),
      )
      const events = await pipe(test, Fx.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, [1, 4, 7, 10, 14])
    })
  })

  describe(Fx.filterLoop.name, () => {
    it('tracks state and atomically computing a value, using Option for filtering', async () => {
      const values = ['foo', 'bar', 'baz', 'quux']
      const test = pipe(
        Fx.fromIterable(values),
        Fx.filterLoop(1, (a, b) =>
          b.startsWith('b') ? Option.some([a + b.length, a]) : Option.none,
        ),
      )
      const events = await pipe(test, Fx.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, [1, 4])
    })
  })

  describe(Fx.filterScan.name, () => {
    it('emits seed value and tracks applies a reducer to events and accumulator, using Option for filtering', async () => {
      const values = ['foo', 'bar', 'baz', 'quux']
      const test = pipe(
        Fx.fromIterable(values),
        Fx.filterScan(1, (a, b) => (b.startsWith('b') ? Option.some(a + b.length) : Option.none)),
      )
      const events = await pipe(test, Fx.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, [1, 4, 7])
    })
  })
})
