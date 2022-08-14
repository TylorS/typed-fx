import { deepStrictEqual } from 'assert'

import { Fx, access, success } from './Fx.js'
import { runMain } from './run.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(Fx.name, () => {
    describe('Sync', () => {
      it('allows running sync effects', async () => {
        const value = Math.random()
        const test = success(value)

        deepStrictEqual(await runMain(test), value)
      })

      it('allows using try/catch locally', async () => {
        const error = new Error('foo')
        const value = Math.random()
        const test = access(() =>
          // eslint-disable-next-line require-yield
          Fx(function* () {
            try {
              throw new Error('foo')
            } catch (e) {
              deepStrictEqual(e, error)

              return value
            }
          }),
        )

        deepStrictEqual(await runMain(test), value)
      })

      it('allows using try/catch within nested Fx', async () => {
        const error = new Error('foo')
        const value = Math.random()
        const test = Fx(function* () {
          try {
            yield* access(() =>
              // eslint-disable-next-line require-yield
              Fx(function* () {
                throw new Error('foo')
              }),
            )
          } catch (e) {
            deepStrictEqual(e, error)

            return value
          }
        })

        deepStrictEqual(await runMain(test), value)
      })
    })
  })
})
