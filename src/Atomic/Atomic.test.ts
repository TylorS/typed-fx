import { deepStrictEqual } from 'assert'

import { Atomic } from './Atomic.js'

import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe(Atomic.name, () => {
    it('allows getting/setting data', () => {
      const initialValue = Math.random()
      const atomic = Atomic(initialValue)

      deepStrictEqual(atomic.get(), initialValue)

      const nextValue = Math.random()
      atomic.set(nextValue)

      deepStrictEqual(atomic.get(), nextValue)
    })

    it('allows modifying data', () => {
      const initialValue = Math.random()
      const atomic = Atomic(initialValue)

      deepStrictEqual(
        atomic.modify((value) => [value, value + 1]),
        initialValue,
      )

      deepStrictEqual(atomic.get(), initialValue + 1)
    })
  })
})
