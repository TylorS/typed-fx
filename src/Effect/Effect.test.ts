import { deepStrictEqual, ok } from 'assert'
import { performance } from 'perf_hooks'

import { Either, pipe } from 'hkt-ts'

import * as Effect from './Effect.js'
import { EffectRuntime } from './EffectRuntime.js'

import { CauseError } from '@/Cause/CauseError.js'
import * as Cause from '@/Cause/index.js'
import * as Exit from '@/Exit/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
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

  it('handles composition control flow', async () => {
    const first = Math.random()
    const second = Math.random()

    const expected = (first * 2) / (second * 2)

    deepStrictEqual(
      await runTest(
        pipe(
          Effect.now(first),
          Effect.map((a: number) => a * 2),
          Effect.flatMap((a) =>
            pipe(
              Effect.now(second),
              Effect.map((a: number) => a * 2),
              Effect.flatMap((b) => Effect.now(a / b)),
            ),
          ),
        ),
      ),
      expected,
    )
  })

  it('native comparison', () => {
    const fib = (n: number): number => {
      if (n < 2) return n
      return fib(n - 1) + fib(n - 2)
    }

    const total = 100
    let values = 0

    for (let i = 0; i < total; ++i) {
      const start = performance.now()

      fib(25)

      values += performance.now() - start
    }

    console.log('Average:', values / total, 'ms')
  })

  it('runs fib', async () => {
    const fib = (n: number): Effect.Effect<never, never, number> => {
      if (n < 2) {
        return Effect.Effect.Now(n)
      }

      return Effect.Effect.FlatMap(fib(n - 2), (a) => Effect.Effect.Map(fib(n - 1), (b) => a + b))
    }

    console.time('Effect Construction')
    const program = fib(25)
    console.timeEnd('Effect Construction')

    const total = 100
    let values = 0

    for (let i = 0; i < total; ++i) {
      values += await runBench(program)
    }

    console.log('Average:', values / total, 'ms')
  })
})

const runBench = <A>(program: Effect.Effect<never, never, A>) =>
  new Promise<number>((resolve) => {
    const runtime = new EffectRuntime(program)
    runtime.addObserver(() => {
      resolve(performance.now() - start)
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
