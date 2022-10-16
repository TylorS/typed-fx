import { deepStrictEqual, ok } from 'assert'

import * as Either from 'hkt-ts/Either'
import { Left } from 'hkt-ts/Either'
import { absurd, identity, pipe } from 'hkt-ts/function'

import { Effect } from './Effect.js'
import { EffectRuntime } from './EffectRuntime.js'
import * as Op from './ops.js'

import { Disposable, settable } from '@/Disposable/Disposable.js'
import { Empty } from '@/Env/Env.js'
import { Exit, expected, interrupt } from '@/Exit/index.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Platform } from '@/Platform/Platform.js'
import { Service } from '@/Service/Service.js'
import { Delay } from '@/Time/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite.only(import.meta.url, () => {
  it('runs Fib', async () => {
    const fib = (n: number): Effect<never, never, number> => {
      if (n < 2) {
        return Op.now(n)
      }

      return pipe(
        fib(n - 1),
        Op.flatMap((a) =>
          pipe(
            fib(n - 2),
            Op.map((b) => a + b),
          ),
        ),
      )
    }

    console.time('Fx: Fib25 Construction')
    const program = fib(25)
    console.timeEnd('Fx: Fib25 Construction')
    const iterations = 20
    let values = 0
    for (let i = 0; i < iterations; i++) {
      console.time('Fib25')
      const r = new EffectRuntime(program, Empty)

      await new Promise<void>((resolve) => {
        const start: number = performance.now()

        r.addObserver(() => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          values += performance.now() - start!
          console.timeEnd('Fib25')
          resolve()
        })

        r.start()
      })
    }

    console.log('Fx: Fib25 Average', values / iterations)
  })

  it('runs Now', async () => {
    const value = Math.random()

    deepStrictEqual(await runMain(Op.now(value)), value)
  })

  it('runs FromLazy', async () => {
    const value = Math.random()

    deepStrictEqual(await runMain(Op.fromLazy(() => value)), value)
  })

  it('runs Lazy', async () => {
    const value = Math.random()

    deepStrictEqual(await runMain(Op.lazy(() => Op.now(value))), value)
  })

  it('runs Fail', async () => {
    const value = Math.random()
    const exit = expected(value)

    deepStrictEqual(await runExit(Op.fromExit(exit)), exit)
  })

  it('runs Map', async () => {
    const value = Math.random()
    const test = pipe(
      Op.now(value),
      Op.map((v) => v + 2),
      Op.map((v) => v ** 2),
    )

    deepStrictEqual(await runMain(test), (value + 2) ** 2)
  })

  it('runs MapLeft', async () => {
    const value = Math.random()
    const exit = expected(value)
    const test = pipe(
      Op.fromExit(exit),
      Op.mapLeft((v) => v + 2),
      Op.mapLeft((v) => v ** 2),
    )

    deepStrictEqual(await runExit(test), expected((value + 2) ** 2))
  })

  describe('bimap', async () => {
    it('applies first function during failure', async () => {
      const value = Math.random()
      const exit = expected(value)
      const test = pipe(
        Op.fromExit(exit),
        Op.bimap(
          (v) => v + 2,
          (v) => v ** 2,
        ),
      )

      deepStrictEqual(await runExit(test), expected(value + 2))
    })

    it('applies second function during succes', async () => {
      const value = Math.random()
      const test = pipe(
        Op.now(value),
        Op.bimap(
          (v) => v + 2,
          (v) => v ** 2,
        ),
      )

      deepStrictEqual(await runMain(test), value ** 2)
    })
  })

  it('runs FlatMap', async () => {
    const value = Math.random()
    const test = pipe(
      Op.now(value),
      Op.flatMap((v) => Op.fromLazy(() => v + 2)),
      Op.flatMap((v) => Op.now(v ** 2)),
    )

    deepStrictEqual(await runMain(test), (value + 2) ** 2)
  })

  it('runs OrElse', async () => {
    const value = Math.random()
    const test = pipe(
      Op.fromExit(expected(value)),
      Op.orElse((v) => Op.fromLazy(() => v + 2)),
      Op.flatMap((v) => Op.now(v ** 2)),
    )

    deepStrictEqual(await runMain(test), (value + 2) ** 2)
  })

  describe('match', () => {
    it('applies first function during failure', async () => {
      const value = Math.random()
      const exit = expected(value)
      const test = pipe(
        Op.fromExit(exit),
        Op.match(
          (v) => Op.now(v + 2),
          (v) => Op.now(v ** 2),
        ),
      )

      deepStrictEqual(await runMain(test), value + 2)
    })

    it('applies second function during succes', async () => {
      const value = Math.random()
      const test = pipe(
        Op.now(value),
        Op.match(
          (v) => Op.now(v + 2),
          (v) => Op.now(v ** 2),
        ),
      )

      deepStrictEqual(await runMain(test), value ** 2)
    })
  })

  describe('interrupts', () => {
    const platform = Platform()

    it('can be interrupted', async () => {
      const value = Math.random()
      const test = Op.async<never, never, number>((cb) =>
        Left(platform.timer.setTimer(() => cb(Op.now(value)), Delay(100))),
      )
      const r = new EffectRuntime(test, Empty, platform)

      r.start()

      deepStrictEqual(await runMain(r.interruptAs(FiberId.None)), interrupt(FiberId.None))
    })

    it('can be marked uninterruptable', async () => {
      const value = Math.random()
      const test = Op.uninterruptable(
        Op.async<never, never, number>((cb) =>
          Left(platform.timer.setTimer(() => cb(Op.now(value)), Delay(100))),
        ),
      )
      const r = new EffectRuntime(test, Empty, platform)

      r.start()

      deepStrictEqual(await runMain(r.interruptAs(FiberId.None)), Either.Right(value))
    })

    it('cleans up async resources', async () => {
      const value = Math.random()
      let disposed = false
      const inner = settable()
      inner.add(Disposable(() => (disposed = true)))
      const test = Op.async<never, never, number>((cb) => {
        inner.add(platform.timer.setTimer(() => cb(Op.now(value)), Delay(100)))
        return Left(inner)
      })
      const r = new EffectRuntime(test, Empty, platform)

      r.start()

      deepStrictEqual(await runMain(r.interruptAs(FiberId.None)), interrupt(FiberId.None))
      ok(disposed)
    })
  })

  describe('async', () => {
    const platform = Platform()

    it('runs async operations', async () => {
      const value = Math.random()
      const test = Op.async<never, never, number>((cb) =>
        Left(platform.timer.setTimer(() => cb(Op.now(value)), Delay(0))),
      )

      deepStrictEqual(await runMain(test, platform), value)
    })

    it('runs async operations that fail', async () => {
      const value = Math.random()
      const exit = expected(value)
      const test = Op.async<never, number, never>((cb) =>
        Left(platform.timer.setTimer(() => cb(Op.fromExit(exit)), Delay(0))),
      )

      deepStrictEqual(await runExit(test, platform), exit)
    })

    it('allows syncronously providing the next Effect', async () => {
      const value = Math.random()
      const test = Op.async<never, never, number>(() => Either.Right(Op.now(value)))

      deepStrictEqual(await runMain(test, platform), value)
    })
  })

  it('allows using and providing the environment', async () => {
    const value = Math.random()
    interface Foo {
      readonly foo: string
    }
    const Foo = Service<Foo>('Foo')

    const test = pipe(
      Op.ask(Foo),
      Op.map(({ foo }) => foo.toUpperCase()),
      Op.provideService(Foo, { foo: 'asdf' + value }),
    )

    deepStrictEqual(await runMain(test), 'ASDF' + value)
  })
})

const runMain = <E, A>(eff: Effect<never, E, A>, platform: Platform = Platform()) =>
  runMap(eff, Either.getOrElse(absurd<A>), platform)
const runExit = <E, A>(eff: Effect<never, E, A>, platform: Platform = Platform()) =>
  runMap(eff, identity, platform)

function runMap<E, A, B>(
  eff: Effect<never, E, A>,
  f: (exit: Exit<E, A>) => B,
  platform: Platform,
): Promise<B> {
  return new Promise<B>((resolve) => {
    const r = new EffectRuntime(eff, Empty, platform)
    r.addObserver((a) => resolve(f(a)))
    r.start()
  })
}
