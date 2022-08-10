import { deepStrictEqual } from 'assert'

import { Right } from 'hkt-ts/Either'

import { Finalizer } from '../Finalizer/Finalizer.js'
import { Fx, success } from '../Fx/Fx.js'
import { runMain } from '../Fx/run.js'

import { Closeable, wait } from './Closeable.js'
import { Closed, Closing, Open, ScopeState } from './ScopeState.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(wait.name, () => {
    describe('given a Closing scope', () => {
      it('returns the Exit value', async () => {
        const exit = Right(42)
        const scope = stateCloseable(Closing(exit))
        const actual = await runMain(wait(scope))

        deepStrictEqual(actual, exit)
      })
    })

    describe('given a Closed scope', () => {
      it('returns the Exit value', async () => {
        const exit = Right(42)
        const scope = stateCloseable(Closed(exit))
        const actual = await runMain(wait(scope))

        deepStrictEqual(actual, exit)
      })
    })

    describe('given an Open scope', () => {
      it('awaits the closed value', async () => {
        const exit = Right(42)
        const scope = stateCloseable(Open)
        const promise = runMain(wait(scope))

        await Promise.resolve() // Allow "wait" to start

        // Close the Scope
        await runMain(scope.close(exit))

        // Validate that Async runs
        deepStrictEqual(await promise, exit)
      })
    })
  })
})

const stateCloseable = (state: ScopeState): Closeable => {
  const finalizers = new Set<Finalizer>()

  const scope: Closeable = {
    state,
    ensuring(f) {
      finalizers.add(f)

      return () => success(finalizers.delete(f))
    },
    fork: () => scope,
    close: (exit) =>
      Fx(function* () {
        if (finalizers.size === 0) {
          return false
        }

        for (const f of Array.from(finalizers).reverse()) {
          yield* f(exit)
        }

        return true
      }),
  }

  return scope
}
