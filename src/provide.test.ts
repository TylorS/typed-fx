import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import * as Scope from '@effect/core/io/Scope'
import { pipe } from '@tsplus/stdlib/data/Function'
import { Tag } from '@tsplus/stdlib/service/Tag'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.provideService.name, () => {
    it('provides a service to the Fx', async () => {
      const test = Effect.gen(function* ($) {
        const scope = yield* $(Scope.make)

        const result = yield* $(
          pipe(
            Fx.service(Scope.Scope.Tag),
            Fx.flatMap((s) => Fx.fromIterable([s, s])),
            Fx.provideService(Scope.Scope.Tag, scope),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [scope, scope])
      })

      await Effect.unsafeRunPromise(test)
    })
  })

  describe(Fx.provideLayer.name, () => {
    it('provides a layer to the Fx', async () => {
      const test = Effect.gen(function* ($) {
        const value = `${Math.random()}`
        class Foo {
          static Tag = Tag<Foo>()
          constructor(readonly foo: string) {}
        }

        const result = yield* $(
          pipe(
            Fx.service(Foo.Tag),
            Fx.flatMap((s) => Fx.succeed(s.foo)),
            Fx.provideLayer(Effect.toLayer(Foo.Tag)(Effect.succeed(new Foo(value)))),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [value])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
