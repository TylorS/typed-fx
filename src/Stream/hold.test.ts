import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { collect } from './drain.js'
import { fromCallback } from './fromCallback.js'
import { hold } from './hold.js'

import { provideService, runMain } from '@/Fx/index.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { Scheduler } from '@/Scheduler/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(hold.name, () => {
    const scheduler = RootScheduler()
    const collectAll = <E, A>(stream: Stream<never, E, A>) =>
      pipe(stream, collect, provideService(Scheduler, scheduler), runMain)

    it('should be collectable', async () => {
      let started = 0
      const value = Math.random()
      const stream = hold(
        fromCallback<never, number>(async ({ event, end }) => {
          started++
          event(value)
          await new Promise((resolve) => setTimeout(resolve, 50))
          event(value + 1)
          await new Promise((resolve) => setTimeout(resolve, 100))
          event(value + 2)
          end()
        }),
      )

      const a = collectAll(stream)

      await new Promise((resolve) => setTimeout(resolve, 25))

      const b = collectAll(stream)

      await new Promise((resolve) => setTimeout(resolve, 50))

      const c = collectAll(stream)

      deepStrictEqual(await a, [value, value + 1, value + 2])
      deepStrictEqual(await b, [value, value + 1, value + 2])
      deepStrictEqual(await c, [value + 1, value + 2])
      deepStrictEqual(started, 1)
    })
  })
})
