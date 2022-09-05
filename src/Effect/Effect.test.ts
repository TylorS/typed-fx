import { deepStrictEqual, ok } from 'assert'
import { performance } from 'perf_hooks'

import { Either, pipe } from 'hkt-ts'

import * as Effect from './Effect.js'
import { EffectRuntime } from './EffectRuntime.js'

import { CauseError } from '@/Cause/CauseError.js'
import * as Cause from '@/Cause/index.js'
import * as Exit from '@/Exit/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite.only(import.meta.url, () => {
  it('Now', async () => {
    const value = Math.random()
    deepStrictEqual(await runTest(Effect.now(value)), value)
  })

  it('FromLazy', async () => {
    const value = Math.random()
    deepStrictEqual(await runTest(Effect.fromLazy(() => value)), value)
  })

  it('Lazy', async () => {
    const value = Math.random()
    deepStrictEqual(await runTest(Effect.lazy(() => Effect.now(value))), value)
  })

  it('FromCause', async () => {
    const cause = Cause.unexpected(new Error('test'))
    const exit = await runTestExit(Effect.fromCause(cause))

    ok(Either.isLeft(exit))
    ok(exit.left.tag === 'Traced')
    deepStrictEqual(exit.left.cause, cause)
  })

  it('Map', async () => {
    const value = Math.random()
    deepStrictEqual(await runTest(Effect.map((a: number) => a * 2)(Effect.now(value))), value * 2)
  })

  it('FlatMap', async () => {
    const value = Math.random()
    deepStrictEqual(
      await runTest(Effect.flatMap((a: number) => Effect.now(a * 2))(Effect.now(value))),
      value * 2,
    )
  })

  it('runs as generators', async () => {
    const value = Math.random()
    const program = Effect.Effect(function* (_) {
      const a = yield* _(Effect.now(value))
      return a * 2
    })

    deepStrictEqual(await runTest(program), value * 2)
  })

  it('handles composition control flow', async () => {
    const first = Math.random()
    const second = Math.random()

    const expected = first / 2 / (second / 2)

    deepStrictEqual(
      await runTest(
        pipe(
          Effect.now(first),
          Effect.map((a: number) => a / 2),
          Effect.map((f) => f / (second / 2)),
        ),
      ),
      expected,
    )
  })

  it('allows yielding/handling effects', async () => {
    class Add extends Effect.instr('Add')<ReadonlyArray<number>, never, number> {
      sum() {
        return this.input.reduce((a, b) => a + b, 0)
      }
    }

    const program = pipe(
      Effect.yield(new Add([1, 2, 3])),
      Effect.handle(Effect.handler(Add, (add) => Effect.now(add.sum()))),
    )

    console.time('Yield/Handle')
    deepStrictEqual(await runTest(program), 6)
    console.timeEnd('Yield/Handle')
  })

  describe('Fib micro-benchmarks', () => {
    it('native comparison (recursive v1)', () => {
      const fib = (n: number): number => {
        if (n < 2) return n
        return fib(n - 1) + fib(n - 2)
      }

      const total = 100
      let values = 0

      for (let i = 0; i < total; ++i) {
        const start = performance.now()
        const value = fib(25)
        values += performance.now() - start
        deepStrictEqual(value, 75025)
      }

      console.log('Average:', values / total, 'ms')
    })

    it('native comparison (recursive v2)', () => {
      const fib = (n: number, n1 = 0, n2 = 1): number => {
        if (n < 2) return n2
        return fib(n - 1, n2, n1 + n2)
      }

      const total = 100
      let values = 0

      for (let i = 0; i < total; ++i) {
        const start = performance.now()
        const value = fib(25)
        values += performance.now() - start
        deepStrictEqual(value, 75025)
      }

      console.log('Average:', values / total, 'ms')
    })

    it('runs fib (recursive v1)', async () => {
      const fib = (n: number): Effect.Effect<never, never, number> => {
        if (n < 2) {
          return Effect.Effect.Now(n)
        }

        return Effect.Effect.FlatMap(fib(n - 2), (a) => Effect.Effect.Map(fib(n - 1), (b) => a + b))
      }

      const constructorStart = performance.now()
      const program = fib(25)
      const constructorEnd = performance.now()

      const total = 100
      let values = 0

      for (let i = 0; i < total; ++i) {
        values += await runBench(program, 75025)
      }

      console.log(`Constructor: ${constructorEnd - constructorStart}ms`)
      console.log('Average:', values / total + 'ms')
      console.log('Total:', values / total + (constructorEnd - constructorStart) + 'ms')
    })

    it('runs fib (recursive v2)', async () => {
      const fib = (n: number, n1 = 0, n2 = 1): Effect.Effect<never, never, number> => {
        if (n < 2) {
          return Effect.Effect.Now(2)
        }

        return fib(n - 1, n2, n1 + n2)
      }

      const constructorStart = performance.now()
      const program = fib(25)
      const constructorEnd = performance.now()

      const total = 100
      let values = 0

      for (let i = 0; i < total; ++i) {
        values += await runBench(program, 75025)
      }

      console.log(`Constructor: ${constructorEnd - constructorStart}ms`)
      console.log('Average:', values / total + 'ms')
      console.log('Total:', values / total + (constructorEnd - constructorStart) + 'ms')
    })

    it('runs fib w/ generators (recursive v1)', async () => {
      const fib = (n: number): Effect.Effect<never, never, number> =>
        Effect.Effect(function* (_) {
          if (n < 2) {
            return n
          }

          return (yield* _(fib(n - 1))) + (yield* _(fib(n - 1)))
        })

      const constructorStart = performance.now()
      const program = fib(25)
      const constructorEnd = performance.now()

      const total = 100
      let values = 0

      for (let i = 0; i < total; ++i) {
        values += await runBench(program, 75025)
      }

      console.log(`Constructor: ${constructorEnd - constructorStart}ms`)
      console.log('Average:', values / total + 'ms')
      console.log('Total:', values / total + (constructorEnd - constructorStart) + 'ms')
    })
  })
})

const runBench = <A>(program: Effect.Effect<never, never, A>, expected: A) =>
  new Promise<number>((resolve, reject) => {
    const runtime = new EffectRuntime(program)
    runtime.addObserver((exit) => {
      resolve(performance.now() - start)

      if (Either.isLeft(exit)) {
        reject(new CauseError(exit.left))
      } else {
        try {
          deepStrictEqual(exit.right, expected)
          resolve(performance.now() - start)
        } catch (e) {
          reject(e)
        }
      }
    })
    const start = performance.now()
    runtime.start(false)
  })

const runTestExit = <E, A>(program: Effect.Effect<never, E, A>) =>
  new Promise<Exit.Exit<E, A>>((resolve) => {
    const runtime = new EffectRuntime(program)
    runtime.addObserver(resolve)
    runtime.start(false)
  })

const runTest = <A>(program: Effect.Effect<never, never, A>) =>
  runTestExit(program).then(
    Either.match(
      (cause) => Promise.reject(new CauseError(cause)),
      (a) => Promise.resolve(a),
    ),
  )
