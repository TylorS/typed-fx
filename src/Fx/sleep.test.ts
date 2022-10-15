import { deepStrictEqual, ok } from 'assert'
import { performance } from 'perf_hooks'

import { runMain } from './run.js'
import { sleep } from './sleep.js'

import { FiberContext } from '@/FiberContext/FiberContext.js'
import { TestPlatform } from '@/Platform/TestPlatform.js'
import { Runtime } from '@/Runtime/Runtime.js'
import { Delay } from '@/Time/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(sleep.name, () => {
    describe('TestPlatform', () => {
      it('delays an Fx until the delay has passed', async () => {
        const delay = Delay(100)
        const test = sleep(delay)

        const platform = TestPlatform()
        const runtime = Runtime(FiberContext({ platform }))

        const promise = runtime.run(test)
        const time = platform.timer.progressTimeBy(delay)

        deepStrictEqual(await promise, time)
      })
    })

    describe('Default', () => {
      it('delays an Fx until the delay has passed', async () => {
        const delay = Delay(100)
        const test = sleep(delay)

        const start = performance.now()
        await runMain(test)
        const end = performance.now()
        const elapsed = end - start

        // Delay should be fairly accurate
        ok(elapsed >= delay && elapsed <= delay + 2)
      })
    })
  })
})
