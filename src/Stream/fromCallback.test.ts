import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collect } from './drain.js'
import { fromCallback } from './fromCallback.js'

import * as Fx from '@/Fx/index.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(fromCallback.name, () => {
    const value = Math.random()
    const stream = fromCallback<never, number>(async ({ event, end }) => {
      await event(value)
      await event(value + 1)
      await event(value + 2)
      await end()
    })

    it('should be collectable', async () => {
      await pipe(
        Fx.Fx(function* () {
          const events: readonly number[] = yield* collect(stream)

          deepStrictEqual(events, [value, value + 1, value + 2])
        }),
        Fx.provideService(Scheduler, RootScheduler()),
        Fx.runMain,
      )
    })
  })
})
