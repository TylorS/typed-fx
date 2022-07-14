import { deepStrictEqual } from 'assert'

import * as Fx from './index'

import * as Exit from '@/Exit/index'
import { runMain } from '@/Runtime/MainRuntime'

describe(__filename, () => {
  describe(Fx.Fx.name, () => {
    describe('InstructionSet', () => {
      describe(Fx.FromExit.name, () => {
        describe('given a Right value', () => {
          it('returns that value', async () => {
            const value = 1
            const test = Fx.fromExit(Exit.success(value))

            deepStrictEqual(await runMain(test), value)
          })
        })
      })
    })
  })
})
