import assert from 'assert'

import { pipe } from 'hkt-ts/function'

import { Eff, runEff } from './Eff.js'
import { handle } from './handle.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(handle.name, () => {
    class GetNums extends Eff.Instruction<void, ReadonlyArray<number>> {
      static tag = 'GetNums' as const
      readonly tag = GetNums.tag
    }
    class Sum extends Eff.Instruction<ReadonlyArray<number>, number> {
      static tag = 'Sum' as const
      readonly tag = Sum.tag
    }

    type Instruction = GetNums | Sum

    // eslint-disable-next-line require-yield
    it('allows removing instructions from the Eff Instruction Set', () => {
      const test = Eff(function* () {
        const nums = yield* new GetNums()
        const sum = yield* new Sum(nums)

        return sum
      })

      assert.deepStrictEqual(
        pipe(
          test,
          // eslint-disable-next-line require-yield
          handle(function* (
            gen: Generator<Instruction, number>,
            result: IteratorResult<Instruction, number>,
          ) {
            while (!result.done) {
              const instr = result.value

              if (instr.is(GetNums)) {
                result = gen.next([1, 2, 3])
              } else {
                result = gen.next(instr.input.reduce((x, y) => x + y, 0))
              }
            }

            return result.value
          }),
          runEff,
        ),
        6,
      )
    })

    it('allows responding to errors locally ', () => {
      const test = Eff(function* () {
        try {
          const nums = yield* new GetNums()
          const sum = yield* new Sum(nums)

          return sum
        } catch (e) {
          return 42
        }
      })

      assert.deepStrictEqual(
        pipe(
          test,
          // eslint-disable-next-line require-yield
          handle(function* (
            _gen: Generator<Instruction, number>,
            result: IteratorResult<Instruction, number>,
          ) {
            if (!result.done) {
              throw new Error('test')
            }

            return result.value
          }),
          runEff,
        ),
        42,
      )
    })
  })
})
