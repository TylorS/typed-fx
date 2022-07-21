import { ok } from 'assert'

import { TestRuntime, makeTestRuntime } from './TestRuntime'

import { Time } from '@/Clock/Clock'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import * as Fx from '@/Fx/index'
import { unit } from '@/Fx/index'
import * as S from '@/Schedule/index'

describe(__filename, () => {
  describe(TestRuntime.name, () => {
    it('allows injecting time into tests', async () => {
      const startTime = new Date()
      const delay = Time(100000)
      const runtime = makeTestRuntime(startTime)
      const test = Fx.Fx(function* () {
        const context = yield* getFiberContext
        const fiber = yield* context.scheduler.schedule(unit, S.delayed(delay))

        // Manually progress Time to run our Timer
        // runtime.progessTimeBy(Delay(delay))

        yield* fiber.exit

        const now = new Date()
        const elapsed = now.getTime() - startTime.getTime()

        ok(delay > elapsed, 'Should not take the full delay time')
      })

      await runtime.run(test)
    })
  })
})
