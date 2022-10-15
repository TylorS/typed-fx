import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'
import { Just } from 'hkt-ts/Maybe'
import { IdentitySum } from 'hkt-ts/number'

import * as S from './Stream.js'

import { unexpected } from '@/Exit/Exit.js'
import * as Fx from '@/Fx/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe('fromFx', () => {
    it('emits the success value of an Fx', async () => {
      const stream = S.fromFx(Fx.now(1))
      const test = pipe(stream, S.foldLeft(IdentitySum))

      deepStrictEqual(await Fx.runMain(test), 1)
    })

    it('exits when failures occur', async () => {
      const error = new Error('test')
      const stream = S.fromFx(Fx.fromExit(unexpected(error)))
      const test = pipe(stream, S.foldLeft(IdentitySum))

      deepStrictEqual(await Fx.runMainExit(test), unexpected(error))
    })
  })

  describe('fromArray', () => {
    it('emits all the values from an array', async () => {
      const stream = S.fromArray([1, 2, 3])
      const test = pipe(stream, S.foldLeft(IdentitySum))

      deepStrictEqual(await Fx.runMain(test), 6)
    })
  })

  describe('map', () => {
    it('allows transforming values of a Stream', async () => {
      const test = pipe(
        S.fromArray([1, 2, 3]),
        S.map((x) => x + 1),
        S.foldLeft(IdentitySum),
      )

      deepStrictEqual(await Fx.runMain(test), 9)
    })
  })

  describe('filter', () => {
    it('allows filtering values of a Stream', async () => {
      const test = pipe(
        S.fromArray([1, 2, 3]),
        S.filter((x) => x % 2 === 0),
        S.map((x) => x + 1),
        S.foldLeft(IdentitySum),
      )

      deepStrictEqual(await Fx.runMain(test), 3)
    })
  })

  describe('last', () => {
    it('returns the last emitted value of a Stream', async () => {
      const test = pipe(S.fromArray([1, 2, 3]), S.last)

      deepStrictEqual(await Fx.runMain(test), Just(3))
    })
  })
})
