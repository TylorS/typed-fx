import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { RootScheduler } from '../Scheduler/RootScheduler.js'
import { Scheduler } from '../Scheduler/Scheduler.js'

import { observe } from './drain.js'
import { fromFx } from './fromFx.js'

import { Fx, fromLazy, join, provideService, runMain, success } from '@/Fx/index.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(fromFx.name, () => {
    it('creates a Stream from an Fx', async () => {
      const stream = fromFx(success(1))

      const test = Fx(function* () {
        const fiber = yield* pipe(
          stream,
          observe((a) => fromLazy(() => deepStrictEqual(a, 1))),
        )

        yield* join(fiber)
      })

      await pipe(test, provideService(Scheduler, RootScheduler()), runMain)
    })
  })
})
