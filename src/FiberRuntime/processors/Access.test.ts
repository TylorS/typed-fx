import { ok } from 'assert'

import { processAccess } from './Access'
import { processFx } from './processInstruction'

import { DateClock } from '@/Clock/Clock'
import * as Env from '@/Env/Env'
import { FiberContext } from '@/FiberContext/index'
import { Access } from '@/Fx/InstructionSet/Access'
import { unit } from '@/Fx/index'
import { makeTestRuntime } from '@/Test/TestRuntime'

describe(__filename, () => {
  describe(processAccess.name, () => {
    it('allows accessing the Environment and running an Fx', async () => {
      const context = createFiberContext()
      const clock = new DateClock()
      const env = Env.make(clock)
      const iterable = processAccess(
        new Access((r: Env.Env<DateClock>) => r.get(DateClock)),
        (fx) => processFx(fx, () => context),
      )
      const gen = iterable[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        const instr = result.value

        if (instr.tag === 'GetEnvironment') {
          result = gen.next(env)
        } else {
          throw new Error(`Unexpected instruction ${instr.tag}`)
        }
      }

      ok(result.value === clock)
    })
  })
})

function createFiberContext(): FiberContext {
  return makeTestRuntime(new Date()).makeFiberRuntime(unit, {}).context
}
