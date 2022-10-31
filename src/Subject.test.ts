import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe('Subject', () => {
    it('creates a stream which can be pushed into imperatively', async () => {
      const subject = Fx.Subject.unsafeMake<number, number>()
      const promise = pipe(
        subject,
        Fx.map((n) => n * 2),
        Fx.take(3),
        Fx.runCollect,
        Effect.unsafeRunPromise,
      )

      subject.emit(1)
      subject.emit(2)
      subject.emit(3)
      subject.end()

      deepStrictEqual(await promise, [2, 4, 6])
    })
  })
})
