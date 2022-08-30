import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collect, observe } from './drain.js'
import { fromFx } from './fromFx.js'

import * as Fx from '@/Fx/index.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(fromFx.name, () => {
    const value = Math.random()
    const stream = fromFx(Fx.success(value))

    it('should create a Stream', () =>
      pipe(
        stream,
        observe((n) => Fx.fromLazy(() => deepStrictEqual(n, value))),
        Fx.flatMap(Fx.join),
        Fx.provideService(Scheduler, RootScheduler()),
        Fx.runMain,
      ))

    it('should be collectable', async () => {
      await pipe(
        Fx.Fx(function* () {
          const events = yield* collect(stream)

          deepStrictEqual(events, [value])
        }),
        Fx.provideService(Scheduler, RootScheduler()),
        Fx.runMain,
      )
    })
  })
})
