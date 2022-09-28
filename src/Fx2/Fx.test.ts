import { deepStrictEqual } from 'assert'
import { performance } from 'perf_hooks'

import { pipe } from 'hkt-ts'
import { Left } from 'hkt-ts/Either'

import { Env } from './Env.js'
import { FiberRuntime } from './FiberRuntime.js'
import { Fx } from './Fx.js'
import { fromCause, now } from './constructors.js'
import { flatMap, map } from './control-flow.js'

import * as Cause from '@/Cause/index.js'
import * as Exit from '@/Exit/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite.only(import.meta.url, () => {
  describe('Fx', () => {
    describe('Now', () => {
      it('produces a value', async () => {
        const time = await runDeepStrictEqual(now(1), Exit.success(1))

        printTimeElapsed('Now', time)
      })
    })

    describe('FromCause', () => {
      const cause = Cause.expected('foo')
      it('produces a failure', async () => {
        const time = await runDeepStrictEqual(fromCause(cause), Left(cause))

        printTimeElapsed('FromCause', time)
      })
    })

    it('runs fib', async () => {
      const fib = (n: number): Fx.Of<number> => {
        if (n < 2) {
          return now(n)
        }

        return pipe(
          fib(n - 2),
          flatMap((a) =>
            pipe(
              fib(n - 1),
              map((b) => a + b),
            ),
          ),
        )
      }

      const times = await Promise.all(
        Array.from({ length: 25 }, (_, i) => i + 1).map(async (n) => {
          console.time(`Fx: Fib${n} Construction`)
          const fx = fib(25)
          console.timeEnd(`Fx: Fib${n} Construction`)

          const time = await runDeepStrictEqual(fx, Exit.success(75025))

          console.log(`Fx: Fib${n} took ${time}ms`)

          return time
        }),
      )

      printTimeElapsed('fib(25) Average', times.reduce((a, b) => a + b, 0) / times.length)
    })
  })
})

function printTimeElapsed(name: string, time: number) {
  console.log(`${name} took ${time}ms`)
}

function runDeepStrictEqual<E, A>(fx: Fx.IO<E, A>, expected: Exit.Exit<E, A>) {
  return new Promise<number>((resolve, reject) => {
    const runtime = new FiberRuntime(fx, Env.empty)

    runtime.addObserver((exit) => {
      const end = performance.now() - start
      try {
        deepStrictEqual(exit, expected)
        resolve(end)
      } catch (e) {
        reject(e)
      }
    })

    const start = performance.now()

    runtime.start()
  })
}
