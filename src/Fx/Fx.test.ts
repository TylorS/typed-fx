import { deepStrictEqual } from 'assert'

import { Right } from 'hkt-ts/Either'
import { constVoid, pipe } from 'hkt-ts/function'

import { Fx } from './Fx'
import { Access, ask } from './InstructionSet/Access'
import { Async } from './InstructionSet/Async'
import { Fork } from './InstructionSet/Fork'
import { FromExit, fromExit } from './InstructionSet/FromExit'
import { Provide } from './InstructionSet/Provide'
import { SetInterruptible } from './InstructionSet/SetInterruptable'
import { WithConcurrency } from './InstructionSet/WithConcurrency'
import { ZipAll } from './InstructionSet/ZipAll'

import { die } from '@/Exit/Exit'
import { runMain, runMainExit } from '@/Runtime/MainRuntime'
import { Service } from '@/Service/Service'

describe(__filename, () => {
  describe(Fx.name, () => {
    describe('InstructionSet', () => {
      describe(`${Access.name} / ${Provide.name}`, () => {
        it('allows requesting + providing a Service', async () => {
          const value = 42
          class Foo extends Service {
            readonly value = value
          }
          const test = Fx(function* () {
            const foo = yield* ask(Foo)

            deepStrictEqual(foo.value, value)
          })

          await runMain(pipe(test, Foo.provide(new Foo())))
        })
      })
      describe(FromExit.name, () => {
        it('allows returning a value', async () => {
          deepStrictEqual(await runMain(fromExit(Right(1))), 1)
        })

        it('allows exiting with a Cause', async () => {
          const exit = die(new Error('test'))

          deepStrictEqual(await runMainExit(fromExit(exit)), exit)
        })
      })

      // TODO: Finish writing tests
      describe.skip(Async.name, constVoid)
      describe.skip(Fork.name, constVoid)
      describe.skip(SetInterruptible.name, constVoid)
      describe.skip(WithConcurrency.name, constVoid)
      describe.skip(ZipAll.name, constVoid)
    })
  })
})
