import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collect } from './collect.js'
import { flatMap } from './flatMap.js'
import { fromFx } from './fromFx.js'

import { provideService, success } from '@/Fx/Fx.js'
import { runMain } from '@/Fx/run.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(flatMap.name, () => {
    it('allows collecting stream values into an Array', async () => {
      const stream = pipe(
        success(1),
        fromFx,
        flatMap((a) => fromFx(success(a + 1))),
      )

      const actual = await pipe(
        stream,
        collect,
        provideService(Scheduler, RootScheduler()),
        runMain,
      )

      deepStrictEqual(actual, [2])
    })
  })
})
