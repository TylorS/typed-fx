import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import * as Scope from '@effect/core/io/Scope'
import { pipe } from '@fp-ts/data/Function'
import { Tag } from '@tsplus/stdlib/service/Tag'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.provideService.name, () => {
    it('provides a service to the Push', async () => {
      const test = Effect.gen(function* ($) {
        const scope = yield* $(Scope.make)

        const result = yield* $(
          pipe(
            Push.service(Scope.Scope.Tag),
            Push.flatMap((s) => Push.fromIterable([s, s])),
            Push.provideService(Scope.Scope.Tag, scope),
            Push.runCollect,
          ),
        )

        deepStrictEqual(result, [scope, scope])
      })

      await Effect.unsafeRunPromise(test)
    })
  })

  describe(Push.provideLayer.name, () => {
    it('provides a layer to the Push', async () => {
      const test = Effect.gen(function* ($) {
        const value = `${Math.random()}`
        class Foo {
          static Tag = Tag<Foo>()
          constructor(readonly foo: string) {}
        }

        const result = yield* $(
          pipe(
            Push.service(Foo.Tag),
            Push.flatMap((s) => Push.succeed(s.foo)),
            Push.provideLayer(Effect.toLayer(Foo.Tag)(Effect.succeed(new Foo(value)))),
            Push.runCollect,
          ),
        )

        deepStrictEqual(result, [value])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
