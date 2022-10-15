import { deepEqual, deepStrictEqual, ok } from 'assert'

import { Maybe, pipe } from 'hkt-ts'
import { Just, Nothing } from 'hkt-ts/Maybe'

import { FiberRefs, Locals } from './FiberRefs.js'

import { FiberRef } from '@/FiberRef/FiberRef.js'
import * as Fx from '@/Fx/index.js'
import { Stack } from '@/Stack/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(Locals.name, () => {
    const ref = FiberRef.make(Fx.unit)
    const otherRef = FiberRef.make(Fx.unit, { id: ref.id })
    const locals = Locals([[ref, new Stack(undefined)]] as const)

    it('allows retrieving a Map of current refs to their stack of values', () => {
      const map = locals.getAll()

      deepEqual(map.get(ref)?.value, new Stack(undefined).value)
      deepEqual(map.get(ref)?.previous, null)
    })

    it('allows determining which ref is currently used', () => {
      ok(locals.isCurrentRef(ref))
      ok(!locals.isCurrentRef(otherRef))
    })

    it('allows retrieving the current stack', () => {
      deepStrictEqual(
        pipe(
          locals.getStack(ref),
          Maybe.map((x) => x.value),
        ),
        Just(undefined),
      )
    })

    it('allows retrieving the current value', () => {
      deepStrictEqual(locals.get(ref), Just(undefined))
    })

    it('allows setting the current value', () => {
      const locals = Locals()

      deepStrictEqual(locals.get(ref), Nothing)

      locals.set(ref, undefined)

      deepStrictEqual(locals.get(ref), Just(undefined))
    })

    it('allows deleting the current value', () => {
      const locals = Locals()

      deepStrictEqual(locals.get(ref), Nothing)

      locals.set(ref, undefined)

      deepStrictEqual(locals.get(ref), Just(undefined))

      locals.delete(ref)

      deepStrictEqual(locals.get(ref), Nothing)
    })

    it('pushing/popping the stack', () => {
      const locals = Locals()

      deepStrictEqual(locals.get(ref), Nothing)

      locals.pushLocal(ref, undefined)
      locals.pushLocal(ref, undefined)

      deepStrictEqual(
        pipe(
          locals.getStack(ref),
          Maybe.map((s) => Array.from(s)),
        ),
        Just([undefined, undefined]),
      )

      locals.popLocal(ref)

      deepStrictEqual(
        pipe(
          locals.getStack(ref),
          Maybe.map((s) => Array.from(s)),
        ),
        Just([undefined]),
      )
    })
  })

  describe(FiberRefs.name, () => {
    const value = Math.random()
    const ref = FiberRef.make(Fx.now(value))
    const otherRef = FiberRef.make(Fx.now(value * 2), { id: ref.id })

    describe('get', () => {
      it('initializes the value', async () => {
        const test = Fx.Fx(function* () {
          const a = yield* Fx.get(ref)

          deepStrictEqual(a, value)
        })

        const otherTest = Fx.Fx(function* () {
          const a = yield* Fx.get(otherRef)

          deepStrictEqual(a, value * 2)
        })

        await Promise.all([test, otherTest].map(Fx.runMain))
      })
    })

    describe('modify', () => {
      it('updates the current value and returns a computed value', async () => {
        const test = Fx.Fx(function* () {
          const a = yield* Fx.getAndSet(value * 3)(ref)

          deepStrictEqual(a, value)
          deepStrictEqual(yield* Fx.get(ref), value * 3)
        })

        await Fx.runMain(test)
      })
    })
  })
})
