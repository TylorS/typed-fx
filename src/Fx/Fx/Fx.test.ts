import { deepStrictEqual } from 'assert'

import { runMain } from './DefaultRuntime.js'
import { Fx, fromLazy } from './Fx.js'

const __filename = new URL(import.meta.url).pathname

describe(__filename, () => {
  describe(Fx.name, () => {
    it('allows running sync effects', async () => {
      const value = Math.random()
      const test = Fx(function* () {
        return yield* fromLazy(() => value)
      })

      deepStrictEqual(await runMain(test), value)
    })
  })
})
