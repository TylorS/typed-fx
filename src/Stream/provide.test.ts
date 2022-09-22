import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { collectAll } from './_internal.test.js'

import * as Stream from './index.js'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/index.js'
import { Id } from '@/Service/Id.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  const value = Math.random()
  class Foo extends Id {
    constructor(readonly foo: typeof value) {
      super()
    }
  }

  describe('provide', () => {
    it('should provide the environment', async () => {
      const stream = pipe(
        Stream.now(value),
        Stream.flatMapFx((a) =>
          pipe(
            Foo.ask(),
            Fx.flatMap((foo) => Fx.now(a + foo.foo)),
          ),
        ),
        Stream.provide(Env(Foo.id(), new Foo(value))),
      )

      const events = await collectAll(stream)

      deepStrictEqual(events, [value * 2])
    })
  })

  describe('provideService', () => {
    it('should provide the service', async () => {
      const stream = pipe(
        Stream.now(value),
        Stream.flatMapFx((a) =>
          pipe(
            Foo.ask(),
            Fx.flatMap((foo) => Fx.now(a + foo.foo)),
          ),
        ),
        Stream.provideService(Foo.id(), new Foo(value)),
      )

      const events = await collectAll(stream)

      deepStrictEqual(events, [value * 2])
    })
  })

  describe('provideLayer', () => {
    it('should provide the layer', async () => {
      const stream = pipe(
        Stream.now(value),
        Stream.flatMapFx((a) =>
          pipe(
            Foo.ask(),
            Fx.flatMap((foo) => Fx.now(a + foo.foo)),
          ),
        ),
        Stream.provideLayer(Foo.layerOf(value)),
      )

      const events = await collectAll(stream)

      deepStrictEqual(events, [value * 2])
    })
  })
})
