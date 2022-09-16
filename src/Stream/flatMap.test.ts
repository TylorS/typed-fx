import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collect, observe } from './drain.js'
import { flatMap } from './flatMap.js'
import { fromFx } from './fromFx.js'

import * as Fx from '@/Fx/index.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(flatMap.name, () => {
    const value = Math.random()
    const stream = pipe(
      fromFx(Fx.success(value)),
      flatMap((a) => fromFx(Fx.success(a + 1))),
    )

    it('should create a Stream', () =>
      pipe(
        stream,
        observe((n) => Fx.fromLazy(() => deepStrictEqual(n, value + 1))),
        Fx.flatMap(Fx.join),
        Fx.provideService(Scheduler, RootScheduler()),
        Fx.runMain,
      ))

    it('should be collectable', async () => {
      await pipe(
        Fx.Fx(function* () {
          const events: readonly number[] = yield* collect(stream)

          deepStrictEqual(events, [value + 1])
        }),
        Fx.provideService(Scheduler, RootScheduler()),
        Fx.runMain,
      )
    })
  })
})
