/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as A from 'hkt-ts/Array'
import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'

import * as Exit from '@/Exit/Exit.js'
import {
  FinalizationStrategy,
  Finalizer,
  FinalizerKey,
  finalizationStrategyToConcurrency,
} from '@/Finalizer/Finalizer.js'
import { Fx, Of, attempt, lazy, unit, withConcurrency, zipAll } from '@/Fx/Fx.js'

let nextId = 0

const concatExitSeq = Exit.makeSequentialAssociative<any, any>(First).concat
const concatExitPar = Exit.makeParallelAssociative<any, any>(First).concat

/**
 * ReleaseMap is an underlying class utilizing in the implementation of Managed. It allows
 * tracking multiple Finalizers and closing them.
 */
export class ReleaseMap {
  protected finalizers: Map<FinalizerKey, Finalizer> = new Map()

  constructor(readonly strategy: FinalizationStrategy) {}

  readonly isEmpty = () => this.finalizers.size === 0

  readonly add = (finalizer: Finalizer): FinalizerKey => {
    const id = FinalizerKey(Symbol(nextId++))

    this.finalizers.set(id, finalizer)

    return id
  }

  readonly remove = (key: FinalizerKey): Maybe<Finalizer> => {
    if (!this.finalizers.has(key)) {
      return Nothing
    }

    const finalizer = this.finalizers.get(key)!

    this.finalizers.delete(key)

    return Just(finalizer)
  }

  readonly release = (key: FinalizerKey, exit: Exit.Exit<any, any>): Of<void> =>
    lazy(() =>
      this.finalizers.has(key)
        ? lazy(() => {
            const finalize = this.finalizers.get(key)!(exit) as Of<void>

            this.remove(key)

            return finalize
          })
        : unit,
    )

  readonly releaseAll = (exit: Exit.AnyExit): Of<Exit.AnyExit> => {
    const toBeReleased = () =>
      Array.from(this.finalizers.keys())
        .reverse()
        .map((key) => attempt(this.release(key, exit)))

    const isEmpty = () => this.isEmpty()

    if (this.strategy.strategy === 'Sequential') {
      return Fx(function* () {
        const exits: Array<Exit.AnyExit> = []

        while (!isEmpty()) {
          for (const fx of toBeReleased()) {
            exits.push(yield* fx)
          }
        }

        if (A.isNonEmpty(exits)) {
          return exits.reduce(concatExitSeq, exit)
        }

        return exit
      })
    }

    const releaseAll_ = () =>
      pipe(
        zipAll(toBeReleased()),
        withConcurrency(finalizationStrategyToConcurrency(this.strategy)),
      )

    return Fx(function* () {
      const exits: Array<Exit.AnyExit> = []

      while (!isEmpty()) {
        exits.push((yield* releaseAll_()).reduce(concatExitPar as any))
      }

      if (A.isNonEmpty(exits)) {
        return exits.reduce(concatExitSeq, exit)
      }

      return exit
    })
  }
}
