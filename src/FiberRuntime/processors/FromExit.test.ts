import { deepStrictEqual } from 'assert'

import { Right } from 'hkt-ts/Either'

import { processFromExit } from './FromExit'

import { FromExit } from '@/Fx/InstructionSet/FromExit'

describe(__filename, () => {
  describe(processFromExit.name, () => {
    it('allows returning a value synchronously', async () => {
      const exit = Right(42)
      const iterable = processFromExit(new FromExit(exit))
      const gen = iterable[Symbol.iterator]()
      const result = gen.next()

      deepStrictEqual(result, { done: true, value: exit.right })
    })
  })
})
