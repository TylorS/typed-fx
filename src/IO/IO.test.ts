import { deepStrictEqual } from 'assert'

import { Left, Right } from 'hkt-ts/Either'

import * as IO from './IO.js'
import * as IOFuture from './IOFuture.js'
import { IORefs } from './IORefs.js'
import { IORuntime } from './IORuntime.js'

import * as Cause from '@/Cause/Cause.js'
import * as Exit from '@/Exit/Exit.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe('IO', () => {
    it(IO.Now.tag, (done) => {
      const value = Math.random()
      const io = IO.Now.make(value)

      console.time(IO.Now.tag)
      runTest(
        io,
        (exit) => {
          console.timeEnd(IO.Now.tag)
          deepStrictEqual(exit, Right(value))
        },
        done,
      )
    })

    it(IO.FromLazy.tag, (done) => {
      const value = Math.random()
      const io = IO.FromLazy.make(() => value)

      console.time(IO.FromLazy.tag)
      runTest(
        io,
        (exit) => {
          console.timeEnd(IO.FromLazy.tag)
          deepStrictEqual(exit, Right(value))
        },
        done,
      )
    })

    it(IO.LazyIO.tag, (done) => {
      const value = Math.random()
      const io = IO.LazyIO.make(() => IO.Now.make(value))

      console.time(IO.LazyIO.tag)
      runTest(
        io,
        (exit) => {
          console.timeEnd(IO.LazyIO.tag)
          deepStrictEqual(exit, Right(value))
        },
        done,
      )
    })

    it(IO.FromCause.tag, (done) => {
      const cause = Cause.expected(Math.random())
      const io = IO.FromCause.make(cause)

      console.time(IO.FromCause.tag)
      runTest(
        io,
        (exit) => {
          console.timeEnd(IO.FromCause.tag)
          deepStrictEqual(exit, Left(cause))
        },
        done,
      )
    })

    it(IO.MapIO.tag, (done) => {
      const io = IO.MapIO.make(IO.Now.make(1), (x) => x + 1)

      console.time(IO.MapIO.tag)
      runTest(
        io,
        (exit) => {
          console.timeEnd(IO.MapIO.tag)
          deepStrictEqual(exit, Right(2))
        },
        done,
      )
    })

    it(IO.FlatMapIO.tag, (done) => {
      const io = IO.FlatMapIO.make(IO.Now.make(1), (x) => IO.Now.make(x + 1))

      console.time(IO.FlatMapIO.tag)
      runTest(
        io,
        (exit) => {
          console.timeEnd(IO.FlatMapIO.tag)
          deepStrictEqual(exit, Right(2))
        },
        done,
      )
    })

    it(IO.OrElseIO.tag, (done) => {
      const cause = Cause.expected(Math.random())
      const io = IO.OrElseIO.make(IO.FromCause.make(cause), () => IO.Now.make(1))

      console.time(IO.OrElseIO.tag)
      runTest(
        io,
        (exit) => {
          console.timeEnd(IO.OrElseIO.tag)
          deepStrictEqual(exit, Right(1))
        },
        done,
      )
    })

    it(IO.AttemptIO.tag, (done) => {
      const cause = Cause.expected(Math.random())
      const io = IO.AttemptIO.make(IO.FromCause.make(cause), () => IO.Now.make(1))

      console.time(IO.AttemptIO.tag)
      runTest(
        io,
        (exit) => {
          console.timeEnd(IO.AttemptIO.tag)
          deepStrictEqual(exit, Right(1))
        },
        done,
      )
    })

    it(IO.WaitIO.tag, (done) => {
      const value = Math.random()
      const future = IOFuture.PendingIO<number, number>()
      const io = IO.WaitIO.make(future)

      console.time(IO.WaitIO.tag)
      runTest(
        io,
        (exit) => {
          console.timeEnd(IO.WaitIO.tag)
          deepStrictEqual(exit, Right(value))
        },
        done,
      )

      IOFuture.complete(future)(IO.Now.make(value))
    })
  })

  it('runs fib', async () => {
    const fib = (n: number): IO.IO<never, number> => {
      if (n < 2) {
        return IO.Now.make(n)
      }

      return IO.FlatMapIO.make(fib(n - 2), (a) => IO.MapIO.make(fib(n - 1), (b) => a + b))
    }

    const total = 25
    let values = 0
    console.time('Construct Fib25')
    const program = fib(25)
    console.timeEnd('Construct Fib25')
    for (let i = 0; i < total; ++i) {
      values += await runBench(program, 'Fib25')
    }
    console.log(`(${total} runs) avg: ${values / total}ms`)
  })
})

function runTest<E, A>(
  io: IO.IO<E, A>,
  f: (exit: Exit.Exit<E, A>) => void,
  done: (error?: unknown) => void,
) {
  const runtime = new IORuntime(io, new IORefs())
  runtime.addObserver((exit) => {
    try {
      f(exit)
      done()
    } catch (e) {
      done(e)
    }
  })
  runtime.run()
}

function runBench<E, A>(io: IO.IO<E, A>, label: string) {
  return new Promise<number>((resolve) => {
    const runtime = new IORuntime(io, new IORefs())
    runtime.addObserver(() => {
      const elapsed = performance.now() - start
      resolve(elapsed)
      console.log(`${label}: ${elapsed}ms`)
    })
    const start = performance.now()
    runtime.run()
  })
}
