/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import { pipe } from 'hkt-ts/function'

import { unit } from '@/Eff/Eff.js'
import { Exit } from '@/Exit/Exit.js'
import {
  FinalizationStrategy,
  Finalizer,
  FinalizerKey,
  finalizationStrategyToConcurrency,
} from '@/Finalizer/Finalizer.js'
import { Fx, Of, lazy, mapTo, withConcurrency, zipAll } from '@/Fx/index.js'

let nextId = 0

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

  readonly release = (key: FinalizerKey, exit: Exit<any, any>): Of<void> =>
    lazy(() => (this.finalizers.has(key) ? (this.finalizers.get(key)!(exit) as Of<void>) : unit))

  readonly releaseAll = (exit: Exit<any, any>): Of<void> => {
    const toBeReleased = Array.from(this.finalizers.keys())
      .reverse()
      .map((key) => this.release(key, exit))

    this.finalizers.clear()

    if (this.strategy.strategy === 'Sequential') {
      return Fx(function* () {
        for (const fx of toBeReleased) {
          yield* fx
        }
      })
    }

    return pipe(
      zipAll(toBeReleased),
      withConcurrency(finalizationStrategyToConcurrency(this.strategy)),
      mapTo(undefined),
    )
  }
}
