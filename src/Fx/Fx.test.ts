import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts/function'

import { Fx, Of, access, flatMap, map, now } from './Fx.js'
import { runMain } from './run.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(Fx.name, () => {
    describe('Sync', () => {
      it('allows running sync effects', async () => {
        const value = Math.random()
        const test = now(value)

        deepStrictEqual(await runMain(test), value)
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

        deepStrictEqual(await runMain(test), value)
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

        deepStrictEqual(await runMain(test), value)
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

    console.time('Fx: Fib25 Construction')
    const program = fib(25)
    console.timeEnd('Fx: Fib25 Construction')
    for (let i = 0; i < 10; i++) {
      console.time('Fib25')
      deepStrictEqual(await runMain(program), 75025)
      console.timeEnd('Fib25')
    }
  })

  it('runs Fib w/ generators', async () => {
    const fib = (n: number): Of<number> =>
      Fx(function* () {
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
