import { pipe } from 'hkt-ts'
import { Just, Maybe, Nothing, isJust } from 'hkt-ts/Maybe'

import { FinalizationStrategy, Finalizer, FinalizerKey } from './Finalizer'
import { finalizationStrategyToConcurrency } from './finalizeStrategyToConcurrency'

import { Exit } from '@/Exit/Exit'
import { Fx, Of } from '@/Fx/Fx'
import { success } from '@/Fx/InstructionSet/FromExit'
import { withConcurrency } from '@/Fx/InstructionSet/WithConcurrency'
import { zipAll } from '@/Fx/InstructionSet/ZipAll'
import { lazy } from '@/Fx/lazy'

export class ReleaseMap {
  #keys: Array<FinalizerKey> = []
  #finalizers: Map<FinalizerKey, Finalizer> = new Map()
  #exit: Maybe<Exit<any, any>> = Nothing

  readonly addIfOpen = (finalizer: Finalizer): Maybe<FinalizerKey> => {
    if (isJust(this.#exit)) {
      return Nothing
    }

    const keys = this.#keys
    const finalizers = this.#finalizers
    const key = FinalizerKey(Symbol(finalizer.name ?? finalizer.toString()))

    keys.unshift(key)
    finalizers.set(key, finalizer)

    return Just(key)
  }

  readonly get = (key: FinalizerKey): Maybe<Finalizer> =>
    this.#finalizers.has(key) ? Just(this.#finalizers.get(key) as Finalizer) : Nothing

  readonly release = (key: FinalizerKey, exit: Exit<any, any>): Of<Maybe<unknown>> =>
    lazy(() => {
      const { remove } = this

      return Fx(function* () {
        const finalizer = remove(key)

        if (isJust(finalizer)) {
          return Just(yield* finalizer.value(exit))
        }

        return Nothing
      })
    })

  readonly releaseAll = (
    exit: Exit<any, any>,
    strategy: FinalizationStrategy,
  ): Of<Exit<any, any>> =>
    lazy<Of<Exit<any, any>>>(() => {
      const { release } = this
      this.#exit = Just(exit)

      if (this.#keys.length === 0) {
        return success(exit)
      }

      const removeAll = pipe(
        zipAll(...this.#keys.slice().map((k) => release(k, exit))),
        withConcurrency(finalizationStrategyToConcurrency(strategy)),
      )

      return Fx(function* () {
        yield* removeAll

        return exit
      })
    })

  readonly remove = (key: FinalizerKey): Maybe<Finalizer> => {
    const index = this.#keys.findIndex((x) => x === key)

    if (index > -1) {
      const finalizer = this.#finalizers.get(key) as Finalizer

      this.#keys.splice(index, 1)
      this.#finalizers.delete(key)

      return Just(finalizer)
    }

    return Nothing
  }

  readonly replace = (key: FinalizerKey, finalizer: Finalizer) => {
    const current = this.get(key)

    this.#finalizers.set(key, finalizer)

    return current
  }
}
