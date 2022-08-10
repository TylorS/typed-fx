import { deepStrictEqual } from 'assert'

import { collect } from './collect.js'
import { fromFx } from './fromFx.js'

import { success } from '@/Fx/Fx.js'
import { runMain } from '@/Fx/run.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(collect.name, () => {
    it('allows collecting stream values into an Array', async () => {
      deepStrictEqual(await runMain(collect(fromFx(success(1)))), [1])
    })
  })
})
