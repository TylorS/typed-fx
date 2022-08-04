import * as Maybe from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'
import { toLowerCase } from 'hkt-ts/string'

import { Closeable, getExit } from './Closeable.js'
import { Closed, Closing, Open, ScopeState } from './ScopeState.js'

import { AtomicCounter, decrement, increment } from '@/Atomic/AtomicCounter.js'
import { Exit, makeSequentialAssociative } from '@/Exit/Exit.js'
import {
  FinalizationStrategy,
  Finalizer,
  FinalizerKey,
  finalizationStrategyToConcurrency,
} from '@/Fx/Finalizer/Finalizer.js'
import { Fx, Of, fromLazy, lazy, success, unit, withConcurrency, zipAll } from '@/Fx/Fx/Fx.js'

const { concat: concatExits } = makeSequentialAssociative<any, any>(First)

export class LocalScope implements Closeable {
  #state: ScopeState = Open([], new Map())
  #refCount = AtomicCounter()

  constructor(readonly strategy: FinalizationStrategy) {}

  get state(): ScopeState {
    return this.#state
  }

  readonly ensuring: (finalizer: Finalizer<never, never>) => Maybe.Maybe<Finalizer<never, never>> =
    (finalizer) => {
      if (this.isNotOpen) {
        return Maybe.Nothing
      }

      const key = FinalizerKey(Symbol(finalizer.name))

      this.addFinalizer(key, finalizer)

      return Maybe.Just(() => fromLazy(() => this.removeFinalizer(key)))
    }

  readonly fork = (strategy: FinalizationStrategy = this.strategy): LocalScope => {
    if (this.isNotOpen) {
      throw new Error(`Unable to Fork a ${toLowerCase(this.#state.tag)} Scope`)
    }

    const extended = new LocalScope(strategy)

    // Mutually track resources
    this.ensuring(extended.close)
    extended.ensuring(() => fromLazy(() => decrement(this.#refCount)))

    // Track Reference Count to this Scope
    increment(this.#refCount)

    return extended
  }

  readonly close = (exit: Exit<any, any>): Of<boolean> =>
    lazy(() => {
      this.setExit(exit)

      // Can't close while there is more references
      if (decrement(this.#refCount) > 0) {
        return success(false)
      }

      this.#state = Closing(this.finalizers, getExit(this))
      const releaseAll = pipe(
        zipAll(this.keys.map((key) => this.finalize(key, getExit(this)))),
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
          Maybe.Just(getExit(this)),
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

  /**
   * Returns
   */
  protected finalize(key: FinalizerKey, exit: Exit<any, any>) {
    if (this.#state.tag === 'Closed') {
      return unit
    }

    const finalizer = this.#state.finalizers.get(key)

    this.removeFinalizer(key)

    return finalizer?.(exit) ?? unit
  }

  // Accumulate Exit values
  protected setExit(exit: Exit<any, any>) {
    const state = this.#state

    if (state.tag === 'Open') {
      this.#state = Open(
        state.keys,
        state.finalizers,
        pipe(
          state.exit,
          Maybe.map((e) => concatExits(e, exit)),
          Maybe.getOrElse(() => exit),
          Maybe.Just,
        ),
      )
    }

    if (state.tag === 'Closing') {
      this.#state = Closing(state.finalizers, concatExits(state.exit, exit))
    }
  }
}

function deleteKey<K, V>(key: K, map: ReadonlyMap<K, V>): ReadonlyMap<K, V> {
  const updated = new Map(map)

  updated.delete(key)

  return updated
}
