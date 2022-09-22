import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collectAll } from './_internal.test.js'
import { now } from './fromFx.js'
import { merge } from './merge.js'
import { at } from './scheduled.js'
import { switchMap } from './switchMap.js'

import { Delay } from '@/Time/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(switchMap.name, () => {
    const value = Math.random()
    const stream = pipe(
      now(value),
      switchMap((a) => now(a + 1)),
    )

    it('is collectable', async () => {
      const events = await collectAll(stream)
      deepStrictEqual(events, [value + 1])
    })

    it('is collectable with multiple subscribers', async () => {
      const events = await Promise.all([collectAll(stream), collectAll(stream)])
      deepStrictEqual(events, [[value + 1], [value + 1]])
    })

    it('cancels the previous stream', async () => {
      const stream = pipe(
        at(Delay(0))(1),
        merge(at(Delay(50))(5)),
        switchMap((a) => pipe(now(a), merge(at(Delay(100))(a + 1)))),
      )

      const events = await collectAll(stream)
      deepStrictEqual(events, [1, 5, 6])
    })
  })
})
