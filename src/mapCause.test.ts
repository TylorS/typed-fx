import { deepEqual } from 'assert'

import * as Cause from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import { pipe } from '@fp-ts/data/Function'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.mapCause.name, () => {
    it('maps the cause', async () => {
      const value = Math.random()
      const cause = Cause.fail(value)
      const test = pipe(
        Push.failCause(cause),
        Push.mapCause(Cause.map((x) => x + 1)),
        Push.runDrain,
      )

      deepEqual(await Effect.unsafeRunPromiseExit(test), Exit.fail(value + 1))
    })
  })

  describe(Push.mapError.name, () => {
    it('maps the error', async () => {
      const value = Math.random()
      const cause = Cause.fail(value)
      const test = pipe(
        Push.failCause(cause),
        Push.mapError((x) => x + 1),
        Push.runDrain,
      )

      deepEqual(await Effect.unsafeRunPromiseExit(test), Exit.fail(value + 1))
    })
  })
})
