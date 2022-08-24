import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts/function'

import { Fx, IO, Of, access, flatMap, map, now } from './Fx.js'

import { CauseError } from '@/Cause/CauseError.js'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime.js'

describe.only(new URL(import.meta.url).pathname, () => {
  describe(Fx.name, () => {
    describe('Sync', () => {
      it('allows running sync effects', async () => {
        const value = Math.random()
        const test = now(value)

        deepStrictEqual(await runTest(test), value)
      })

      it('allows using try/catch locally', async () => {
        const error = new Error('foo')
        const value = Math.random()
        const test = access(() =>
          // eslint-disable-next-line require-yield
          Fx(function* () {
            try {
              throw new Error('foo')
            } catch (e) {
              deepStrictEqual(e, error)

              return value
            }
          }),
        )

        deepStrictEqual(await runTest(test), value)
      })

      it('allows using try/catch within nested Fx', async () => {
        const error = new Error('foo')
        const value = Math.random()
        const test = Fx(function* () {
          try {
            yield* access(() =>
              // eslint-disable-next-line require-yield
              Fx(function* () {
                throw new Error('foo')
              }),
            )
          } catch (e) {
            deepStrictEqual(e, error)

            return value
          }
        })

        deepStrictEqual(await runTest(test), value)
      })
    })
  })

  it('runs Fib', async () => {
    const fib = (n: number): Of<number> => {
      if (n < 2) {
        return now(n)
      }

      return pipe(
        fib(n - 1),
        flatMap((a) =>
          pipe(
            fib(n - 2),
            map((b) => a + b),
          ),
        ),
      )
    }

    console.time('Fib25')
    deepStrictEqual(await runTest(fib(25)), 75025)
    console.timeEnd('Fib25')
  })
})

export function runTest<E, A>(io: IO<E, A>): Promise<A> {
  return new Promise((resolve, reject) => {
    const runtime = new FiberRuntime(io)
    runtime.addObserver((exit) =>
      exit.tag === 'Right' ? resolve(exit.right) : reject(new CauseError(exit.left)),
    )
    runtime.startSync()
  })
}
