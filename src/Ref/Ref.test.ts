import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { Ref } from './Ref.js'
import { atomic } from './atomic.js'

import * as Fx from '@/Fx/index.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(Ref.name, () => {
    class Foo extends Ref('Foo', Fx.now(1)) {}
    class Bar extends Ref('Bar', Fx.now(1)) {}

    const foobar = pipe(
      Foo.modify((a) => Fx.now([a + 1, a + 1] as const)),
      Fx.flatMap((foo) =>
        pipe(
          Bar.get(),
          Fx.map((bar) => foo + bar),
        ),
      ),
    )

    describe(atomic.name, () => {
      it('allows providing for a Ref', async () => {
        const test = pipe(foobar, Fx.provideLayers(atomic(Foo), atomic(Bar)))

        deepStrictEqual(await Fx.runMain(test), 3)
      })
    })
  })
})
