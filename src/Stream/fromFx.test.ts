import { deepStrictEqual } from 'assert'

import { collectAll } from './_internal.test.js'
import { fromFx } from './fromFx.js'

import * as Fx from '@/Fx/index.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(fromFx.name, () => {
    const value = Math.random()
    const stream = fromFx(Fx.success(value))

    it('should be collectable', async () => {
      deepStrictEqual(await collectAll(stream), [value])
    })
  })
})
