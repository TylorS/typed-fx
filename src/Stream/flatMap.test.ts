import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collect } from './collect.js'
import { flatMap } from './flatMap.js'
import { fromFx } from './fromFx.js'

import { success } from '@/Fx/Fx.js'
import { runMain } from '@/Fx/run.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(flatMap.name, () => {
    it('allows collecting stream values into an Array', async () => {
      const stream = pipe(
        success(1),
        fromFx,
        flatMap((a) => fromFx(success(a + 1))),
      )

      const actual = await pipe(stream, collect, runMain)

      deepStrictEqual(actual, [2])
    })
  })
})
