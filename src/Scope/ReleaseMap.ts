import { pipe } from 'hkt-ts'
import { Branded } from 'hkt-ts/Branded'
import { Just, Maybe, Nothing, isJust } from 'hkt-ts/Maybe'

import { FinalizationStrategy, Finalizer } from './Finalizer'
import { finalizationStrategyToConcurrency } from './finalizeStrategyToConcurrency'

import { Exit } from '@/Exit/Exit'
import { Fx, Of } from '@/Fx/Fx'
import { success, unit } from '@/Fx/InstructionSet/FromExit'
import { fromLazy, lazy } from '@/Fx/InstructionSet/FromLazy'
import { withConcurrency } from '@/Fx/InstructionSet/WithConcurrency'
import { zipAll } from '@/Fx/InstructionSet/ZipAll'

const noOpFinalizer: Finalizer = () => unit

export class ReleaseMap {
  #keys: Array<FinalizerKey> = []
  #finalizers: Map<FinalizerKey, Finalizer> = new Map()
  #exit: Maybe<Exit<any, any>> = Nothing

  readonly add = (finalizer: Finalizer): Of<Finalizer> => {
    return lazy(() => {
      const keys = this.#keys
      const finalizers = this.#finalizers
      const exit = this.#exit

      if (isJust(exit)) {
        return Fx(function* () {
          yield* finalizer(exit.value)

          return noOpFinalizer
        }) as Of<Finalizer>
      }

      return fromLazy(() => {
        const key = FinalizerKey(Symbol(finalizer.name ?? finalizer.toString()))

        keys.unshift(key)
        finalizers.set(key, finalizer)

        const remove: Finalizer = (exit: Exit<any, any>) => this.release(key, exit)

        return remove
      })
    })
  }

  readonly addIfOpen = (finalizer: Finalizer): Of<Maybe<FinalizerKey>> =>
    fromLazy(() => {
      if (isJust(this.#exit)) {
        return Nothing
      }

      const keys = this.#keys
      const finalizers = this.#finalizers
      const key = FinalizerKey(Symbol(finalizer.name ?? finalizer.toString()))

      keys.unshift(key)
      finalizers.set(key, finalizer)

      return Just(key)
    })

  readonly get = (key: FinalizerKey): Of<Maybe<Finalizer>> =>
    fromLazy(() =>
      this.#finalizers.has(key) ? Just(this.#finalizers.get(key) as Finalizer) : Nothing,
    )

  protected release = (key: FinalizerKey, exit: Exit<any, any>): Of<Maybe<unknown>> =>
    lazy(() => {
      if (!this.#finalizers.has(key)) {
        return success(Nothing)
      }

      const finalizer = this.#finalizers.get(key) as Finalizer

      this.#finalizers.delete(key)

      return Fx(function* () {
        return Just(yield* finalizer(exit))
      })
    }) as Of<Maybe<unknown>>

  readonly releaseAll = (exit: Exit<any, any>, strategy: FinalizationStrategy): Of<void> =>
    lazy<Of<void>>(() => {
      const { remove } = this
      this.#exit = Just(exit)
      const removeAll = pipe(
        zipAll(
          ...this.#keys.map((key) =>
            Fx(function* () {
              const finalizer = yield* remove(key)

              if (isJust(finalizer)) {
                yield* finalizer.value(exit)
              }
            }),
          ),
        ),
        withConcurrency(finalizationStrategyToConcurrency(strategy)),
      )

      return Fx(function* () {
        yield* removeAll
      }) as Of<void>
    })

  readonly remove = (
    key: FinalizerKey,
    index: number = this.#keys.findIndex((x) => x === key),
  ): Of<Maybe<Finalizer>> =>
    fromLazy(() => {
      if (index > -1) {
        const finalizer = this.#finalizers.get(key) as Finalizer

        this.#keys.splice(index, 1)
        this.#finalizers.delete(key)

        return Just(finalizer)
      }

      return Nothing
    })

  readonly replace = (key: FinalizerKey, finalizer: Finalizer) =>
    lazy(() => {
      const { get } = this
      const set = fromLazy(() => this.#finalizers.set(key, finalizer))

      return Fx(function* () {
        const current = yield* get(key)

        yield* set

        return current
      })
    })
}

export type FinalizerKey = Branded<{ readonly FinalizerKey: FinalizerKey }, symbol>
export const FinalizerKey = Branded<FinalizerKey>()
