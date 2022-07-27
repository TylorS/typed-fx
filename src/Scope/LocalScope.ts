import { Just, Maybe, Nothing, getOrElse } from 'hkt-ts/Maybe'
import { pipe } from 'hkt-ts/function'
import { toLowerCase } from 'hkt-ts/string'

import { Closeable, getExit } from './Closeable.js'
import { Closed, Closing, Open, ScopeState } from './ScopeState.js'

import { AtomicCounter } from '@/Atomic/AtomicCounter.js'
import { Exit } from '@/Fx/Exit/Exit.js'
import {
  FinalizationStrategy,
  Finalizer,
  FinalizerKey,
  finalizationStrategyToConcurrency,
} from '@/Fx/Finalizer/Finalizer.js'
import { Fx, fromLazy, fromValue, lazy } from '@/Fx/Fx/Fx.js'
import { withConcurrency } from '@/Fx/Fx/Instruction/WithConcurrency.js'
import { zipAll } from '@/Fx/Fx/Instruction/ZipAll.js'

export class LocalScope implements Closeable {
  #state: ScopeState = Open([], new Map())
  #refCount = new AtomicCounter()

  constructor(readonly strategy: FinalizationStrategy) {}

  get state(): ScopeState {
    return this.#state
  }

  readonly ensuring: (finalizer: Finalizer<never, never>) => Maybe<Finalizer<never, never>> = (
    finalizer,
  ) => {
    if (this.isNotOpen) {
      return Nothing
    }

    const key = FinalizerKey(Symbol(finalizer.name))

    this.addFinalizer(key, finalizer)

    return Just(() => fromLazy(() => this.removeFinalizer(key)))
  }

  readonly fork = (strategy: FinalizationStrategy = this.strategy): LocalScope => {
    if (this.isNotOpen) {
      throw new Error(`Unable to Fork a ${toLowerCase(this.#state.tag)} Scope`)
    }

    const extended = new LocalScope(strategy)

    // Mutually track resources
    this.ensuring(extended.close)
    extended.ensuring(() => fromLazy(() => this.#refCount.decrement))

    // Track Reference Count to this Scope
    this.#refCount.increment

    return extended
  }

  readonly close = (exit: Exit<any, any>) =>
    lazy(() => {
      this.setExitIfNotSet(exit)

      // Can't close while there is more references
      if (this.#refCount.decrement > 0) {
        return fromValue(false)
      }

      this.#state = Closing(this.finalizers, exit)
      const releaseAll = pipe(
        zipAll(...this.keys.map((key) => this.finalize(key, exit))),
        withConcurrency(finalizationStrategyToConcurrency(this.strategy)),
      )

      const setClosed = () => {
        this.#state = Closed(getExit(this))
      }

      return Fx(function* () {
        yield* releaseAll

        setClosed()

        return true
      })
    })

  // Internals

  protected addFinalizer(key: FinalizerKey, finalizer: Finalizer) {
    if (this.isNotOpen) {
      return
    }

    // Unshift key to ensure opposite order when closing scope.
    this.#state = Open([key, ...this.keys], new Map([...this.finalizers, [key, finalizer]]))
  }

  protected removeFinalizer(key: FinalizerKey) {
    if (this.isNotOpen) {
      return
    }

    const finalizers = deleteKey(key, this.finalizers)
    this.#state = this.isOpen
      ? Open(
          this.keys.filter((x) => x !== key),
          finalizers,
        )
      : Closing(finalizers, getExit(this))
  }

  protected get keys() {
    return this.#state.tag === 'Open' ? this.#state.keys : []
  }

  protected get finalizers() {
    return this.#state.tag === 'Closed' ? new Map() : this.#state.finalizers
  }

  protected get isNotOpen() {
    return this.#state.tag !== 'Open'
  }

  protected get isOpen() {
    return this.#state.tag === 'Open'
  }

  protected get isClosed() {
    return this.#state.tag === 'Closed'
  }

  protected finalize(key: FinalizerKey, exit: Exit<any, any>) {
    if (this.#state.tag === 'Closed') {
      return fromValue(undefined)
    }

    const finalizer = this.#state.finalizers.get(key)

    this.removeFinalizer(key)

    return finalizer?.(exit) ?? fromValue(undefined)
  }

  protected setExitIfNotSet(exit: Exit<any, any>) {
    const state = this.#state

    if (state.tag === 'Open') {
      this.#state = Open(
        state.keys,
        state.finalizers,
        pipe(
          state.exit,
          getOrElse(() => exit),
          Just,
        ),
      )
    }
  }
}

function deleteKey<K, V>(key: K, map: ReadonlyMap<K, V>): ReadonlyMap<K, V> {
  const updated = new Map(map)

  updated.delete(key)

  return updated
}
