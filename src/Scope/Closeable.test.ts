import { deepStrictEqual } from 'assert'

import { Right } from 'hkt-ts/Either'
import { constant } from 'hkt-ts/function'

import { Closeable, wait } from './Closeable.js'
import { Closed, Closing, Open, ScopeState } from './ScopeState.js'

import { CauseError } from '@/Cause/CauseError.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import { Fx, IO, fork, fromLazy } from '@/Fx/Fx.js'
import { join } from '@/Fx/join.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(wait.name, () => {
    describe('given a Closing scope', () => {
      it('returns the Exit value', async () => {
        const exit = Right(42)
        const scope = stateCloseable(Closing(exit))
        const actual = await runTest(wait(scope))

        deepStrictEqual(actual, exit)
      })
    })

    describe('given a Closed scope', () => {
      it('returns the Exit value', async () => {
        const exit = Right(42)
        const scope = stateCloseable(Closed(exit))
        const actual = await runTest(wait(scope))

        deepStrictEqual(actual, exit)
      })
    })

    describe('given an Open scope', () => {
      it('awaits the closed value', async () => {
        const exit = Right(42)
        const scope = stateCloseable(Open)
        const test = Fx(function* () {
          const fiber = yield* fork(wait(scope))

          yield* scope.close(exit)

          deepStrictEqual(yield* join(fiber), exit)
        })

        await runTest(test)
      })
    })
  })
})

const stateCloseable = (_state: ScopeState): Closeable => {
  const finalizers = new Set<Finalizer>()

  const scope: Closeable = {
    get state() {
      return _state
    },
    ensuring(f) {
      finalizers.add(f)

      return constant(fromLazy(() => finalizers.delete(f)))
    },
    fork: () => scope,
    close: (exit) =>
      Fx(function* () {
        if (_state.tag !== 'Open') {
          return false
        }

        _state = Closing(exit)

        for (const f of Array.from(finalizers).reverse()) {
          yield* f(exit)
        }

        _state = Closed(exit)

        return true
      }),
  }

  return scope
}

function runTest<E, A>(io: IO<E, A>, context: FiberContext = FiberContext()): Promise<A> {
  return new Promise((resolve, reject) => {
    const runtime = new FiberRuntime(io, context)
    runtime.addObserver((exit) =>
      exit.tag === 'Right' ? resolve(exit.right) : reject(new CauseError(exit.left)),
    )
    runtime.startSync()
  })
}
