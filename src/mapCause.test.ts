import { deepEqual } from 'assert'

import { Cause, Effect, Exit, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.mapCause.name, () => {
    it('maps the cause', async () => {
      const value = Math.random()
      const cause = Cause.fail(value)
      const test = pipe(Fx.failCause(cause), Fx.mapCause(Cause.map((x) => x + 1)), Fx.runDrain)

      deepEqual(await Effect.unsafeRunPromiseExit(test), Exit.fail(value + 1))
    })
  })

  describe(Fx.mapError.name, () => {
    it('maps the error', async () => {
      const value = Math.random()
      const cause = Cause.fail(value)
      const test = pipe(
        Fx.failCause(cause),
        Fx.mapError((x) => x + 1),
        Fx.runDrain,
      )

      deepEqual(await Effect.unsafeRunPromiseExit(test), Exit.fail(value + 1))
    })
  })
})
