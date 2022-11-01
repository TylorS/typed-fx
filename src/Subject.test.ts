import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import { pipe } from '@fp-ts/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe('Subject', () => {
    it('creates a stream which can be pushed into imperatively', async () => {
      const subject = Fx.Subject.unsafeMake<number, number>()
      const promise = pipe(
        subject,
        Fx.map((n) => n * 2),
        Fx.runCollect,
        Effect.unsafeRunPromise,
      )

      subject.unsafeEmit(1)
      subject.unsafeEmit(2)
      subject.unsafeEmit(3)
      subject.unsafeEnd()

      deepStrictEqual(await promise, [2, 4, 6])
    })
  })

  describe('RefSubject', () => {
    it('creates a Ref to sample the current value of the stream', async () => {
      const test = Effect.gen(function* ($) {
        const subject = Fx.RefSubject.unsafeMake<never, number>(() => 1)
        const fiber = yield* $(
          pipe(
            subject,
            Fx.map((n) => n * 2),
            Fx.filter((x) => x % 2 === 0),
            Fx.runCollect,
            Effect.fork,
          ),
        )

        deepStrictEqual(yield* $(subject.get), 1)

        yield* $(subject.emit(1))

        deepStrictEqual(yield* $(subject.get), 1)

        yield* $(subject.emit(2))

        deepStrictEqual(yield* $(subject.get), 2)

        yield* $(subject.emit(3))

        deepStrictEqual(yield* $(subject.get), 3)

        yield* $(subject.end)

        const events = yield* $(Fiber.join(fiber))

        deepStrictEqual(events, [2, 4, 6])
      })

      await Effect.unsafeRunPromise(test)
    })

    it('emits values when ref is updated', async () => {
      const test = Effect.gen(function* ($) {
        const subject = Fx.RefSubject.unsafeMake<never, number>(() => 1)
        const fiber = yield* $(
          pipe(
            subject,
            Fx.map((n) => n * 2),
            Fx.filter((x) => x % 2 === 0),
            Fx.runCollect,
            Effect.fork,
          ),
        )

        deepStrictEqual(yield* $(subject.get), 1)

        yield* $(subject.update((x) => x + 1))
        yield* $(subject.update((x) => x + 1))
        yield* $(subject.update((x) => x + 1))
        yield* $(subject.end)

        const events = yield* $(Fiber.join(fiber))

        deepStrictEqual(events, [4, 6, 8])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
