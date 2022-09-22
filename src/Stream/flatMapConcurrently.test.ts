import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'
import { NonNegativeInteger } from 'hkt-ts/number'

import { collectAll } from './_internal.test.js'
import { flatMapConcurrently } from './flatMapConcurrently.js'
import { fromCallback } from './fromCallback.js'
import { merge } from './merge.js'

import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(flatMapConcurrently.name, () => {
    const value = 42
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    const stream = (level: number) =>
      pipe(
        fromCallback<never, number>(async ({ event, end }) => {
          event(value)
          event(value + 5)
          event(value + 10)
          end()
        }),
        merge(
          fromCallback<never, number>(async ({ event, end }) => {
            event(value + 15)
            event(value + 20)
            end()
          }),
        ),
        flatMapConcurrently(
          (a) =>
            fromCallback<never, number>(async ({ event, end }) => {
              event(a + 1)
              await sleep(10)
              event(a + 2)
              end()
            }),
          NonNegativeInteger(level),
        ),
      )

    it('it should control concurrency', async () => {
      const noConcurrency = await collectAll(stream(Infinity))

      deepStrictEqual(noConcurrency, [
        value + 1,
        value + 5 + 1,
        value + 10 + 1,
        value + 15 + 1,
        value + 20 + 1,
        value + 2,
        value + 5 + 2,
        value + 10 + 2,
        value + 15 + 2,
        value + 20 + 2,
      ])

      const withConcurrency = await collectAll(stream(1))

      deepStrictEqual(withConcurrency, [
        value + 1,
        value + 2,
        value + 5 + 1,
        value + 5 + 2,
        value + 10 + 1,
        value + 10 + 2,
        value + 15 + 1,
        value + 15 + 2,
        value + 20 + 1,
        value + 20 + 2,
      ])
    })
  })
})
