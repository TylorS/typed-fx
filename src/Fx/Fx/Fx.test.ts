import { deepStrictEqual } from 'assert'

import { Fx, success } from './Fx.js'
import { runMain } from './run.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(Fx.name, () => {
    describe('Sync', () => {
      it('allows running sync effects', async () => {
        const value = Math.random()
        const test = success(value)

        deepStrictEqual(await runMain(test), value)
      })
    })
  })
})
