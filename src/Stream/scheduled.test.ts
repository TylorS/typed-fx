import { deepStrictEqual } from 'assert'

import { NonNegativeInteger } from 'hkt-ts/number'

import { collectAll } from './_internal.test.js'
import { scheduled } from './scheduled.js'

import * as Fx from '@/Fx/index.js'
import * as Schedule from '@/Schedule/index.js'
import { Delay } from '@/Time/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(scheduled.name, () => {
    it('runs Fx on Schedule', async () => {
      const value = Math.random()

      deepStrictEqual(await collectAll(scheduled(Schedule.once)(Fx.now(value))), [value])

      deepStrictEqual(await collectAll(scheduled(Schedule.delayed(Delay(1)))(Fx.now(value))), [
        value,
      ])

      deepStrictEqual(
        await collectAll(
          scheduled(Schedule.periodic(Delay(1)).and(Schedule.retries(NonNegativeInteger(1))))(
            Fx.now(value),
          ),
        ),
        [value, value],
      )
    })
  })
})
