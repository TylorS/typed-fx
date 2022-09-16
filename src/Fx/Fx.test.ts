import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts/function'

import * as Fx from './Fx.js'
import { runMain, runMainFiber } from './run.js'

import { FiberId } from '@/FiberId/FiberId.js'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Delay } from '@/Time/index.js'
import { Exit, sleep } from '@/index.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(Fx.Fx.name, () => {
    describe('Sync', () => {
      it('allows running sync effects', async () => {
        const value = Math.random()
        const test = Fx.now(value)

        deepStrictEqual(await runMain(test), value)
      })

      it('allows using try/catch locally', async () => {
        const error = new Error('foo')
        const value = Math.random()
        const test = Fx.access(() =>
          // eslint-disable-next-line require-yield
          Fx.Fx(function* () {
            try {
              throw new Error('foo')
            } catch (e) {
              deepStrictEqual(e, error)

              return value
            }
          }),
        )

        deepStrictEqual(await runMain(test), value)
      })

      it('allows using try/catch within nested Fx', async () => {
        const error = new Error('foo')
        const value = Math.random()
        const test = Fx.Fx(function* () {
          try {
            yield* Fx.access(() =>
              // eslint-disable-next-line require-yield
              Fx.Fx(function* () {
                throw new Error('foo')
              }),
            )
          } catch (e) {
            deepStrictEqual(e, error)

            return value
          }
        })

        deepStrictEqual(await runMain(test), value)
      })
    })
  })

  describe('Interruption', () => {
    it('asynchronous work allows being interrupted', async () => {
      const fiber = runMainFiber(Fx.never)

      deepStrictEqual(await runMain(fiber.interruptAs(FiberId.None)), Exit.interrupt(FiberId.None))
    })

    it('allows marking regions as uninterruptable', async () => {
      const value = Math.random()
      const test = pipe(
        sleep(Delay(100)),
        Fx.flatMap(() => Fx.success(value)),
        Fx.provideService(Scheduler, RootScheduler()),
        Fx.uninterruptable,
      )

      const fiber = new FiberRuntime(test)
      fiber.startSync()

      deepStrictEqual(await runMain(fiber.interruptAs(FiberId.None)), Exit.success(value))
    })
  })

  it('runs Fib', async () => {
    const fib = (n: number): Fx.Of<number> => {
      if (n < 2) {
        return Fx.now(n)
      }

      return pipe(
        fib(n - 1),
        Fx.flatMap((a) =>
          pipe(
            fib(n - 2),
            Fx.map((b) => a + b),
          ),
        ),
      )
    }

    console.time('Fx: Fib25 Construction')
    const program = fib(25)
    console.timeEnd('Fx: Fib25 Construction')
    for (let i = 0; i < 10; i++) {
      console.time('Fib25')
      await runMain(program)
      console.timeEnd('Fib25')
    }
  })

  it('runs Fib w/ generators', async () => {
    const fib = (n: number): Fx.Of<number> =>
      Fx.Fx(function* () {
        if (n < 2) {
          return n
        }

        return (yield* fib(n - 1)) + (yield* fib(n - 2))
      })

    console.time('Fib25')
    deepStrictEqual(await runMain(fib(25)), 75025)
    console.timeEnd('Fib25')
  })
})
