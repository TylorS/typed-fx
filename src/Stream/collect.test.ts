import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { provideService, success } from '../Fx/Fx.js'
import { runMain } from '../Fx/run.js'
import { RootScheduler } from '../Scheduler/RootScheduler.js'
import { Scheduler } from '../Scheduler/Scheduler.js'

import { collect } from './collect.js'
import { fromFx } from './fromFx.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(collect.name, () => {
    it('allows collecting stream values into an Array', async () => {
      const test = collect(fromFx(success(1)))
      const actual = await pipe(test, provideService(Scheduler, RootScheduler()), runMain)

      deepStrictEqual(actual, [1])
    })
  })
})
