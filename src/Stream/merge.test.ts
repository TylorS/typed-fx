import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts/function'

import { collectAll } from './_internal.test.js'
import { fromCallback } from './fromCallback.js'
import { merge } from './merge.js'

import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  const stream = pipe(
    fromCallback<never, number>(async ({ event, end }) => {
      await event(1)
      await event(2)
      await event(3)
      await end()
    }),
    merge(
      fromCallback<never, number>(async ({ event, end }) => {
        await event(4)
        await event(5)
        await end()
      }),
    ),
  )

  it('should be collectable', async () => {
    deepStrictEqual(await collectAll(stream), [1, 4, 2, 5, 3])
  })
})
