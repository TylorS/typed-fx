import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collectAll } from './_internal.test.js'
import { flatMap } from './flatMap.js'
import { fromFx } from './fromFx.js'

import * as Fx from '@/Fx/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(flatMap.name, () => {
    const value = Math.random()
    const stream = pipe(
      fromFx(Fx.success(value)),
      flatMap((a) => fromFx(Fx.success(a + 1))),
    )

    it('should be collectable', async () => {
      const events = await collectAll(stream)
      deepStrictEqual(events, [value + 1])
    })
  })
})
