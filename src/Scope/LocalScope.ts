import { mapTo } from 'hkt-ts/Either'
import * as Maybe from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'

import { Closeable } from './Closeable.js'
import { ReleaseMap } from './ReleaseMap.js'
import { Closed, Closing, Open, ScopeState } from './ScopeState.js'

import { AtomicCounter, decrement, increment } from '@/Atomic/AtomicCounter.js'
import { Exit, makeSequentialAssociative } from '@/Exit/Exit.js'
import { FinalizationStrategy, Finalizer } from '@/Finalizer/Finalizer.js'
import { Of, flatMap, fromExit, fromLazy, lazy, success, uninterruptable, unit } from '@/Fx/Fx.js'

const { concat: concatExits } = makeSequentialAssociative<any, any>(First)

export class LocalScope implements Closeable {
  protected _state: ScopeState = Open
  protected _releaseMap = new ReleaseMap(this.strategy)
  protected _refCount = AtomicCounter()
  protected _exit: Maybe.Maybe<Exit<any, any>> = Maybe.Nothing

  constructor(readonly strategy: FinalizationStrategy) {}

  get state(): ScopeState {
    return this._state
  }

  readonly ensuring: (finalizer: Finalizer) => Finalizer = (finalizer) => {
    if (this.isClosed) {
      return (() => unit) as Finalizer
    }

    const key = this._releaseMap.add(finalizer)

    return (exit) => this._releaseMap.release(key, exit)
  }

  readonly fork = (strategy: FinalizationStrategy = this.strategy): LocalScope => {
    if (this.isClosed) {
      throw new Error(`Unable to Fork a Closed Scope`)
    }

    const extended = new LocalScope(strategy)

    extended.ensuring(() => {
      decrement(this._refCount)

      return this.release
    })

    increment(this._refCount)

    return extended
  }

  readonly close = (exit: Exit<any, any>): Of<boolean> =>
    lazy(() => {
      if (!this.isClosed) {
        this.setExit(exit)
      }

      return this.release
    })

  // Internals

  protected release = lazy(() => {
    if (this._refCount.get() > 0 || Maybe.isNothing(this._exit) || this.isClosed) {
      return success(false)
    }

    const exit = this._exit.value

    return pipe(
      fromLazy(() => (this._state = Closing(exit))),
      flatMap(() => this._releaseMap.releaseAll(exit)),
      flatMap((exit) =>
        pipe(
          fromLazy(() => (this._state = Closed(exit))),
          flatMap(() => pipe(exit, mapTo(true), fromExit) as Of<boolean>),
        ),
      ),
      uninterruptable,
    )
  })

  protected get isClosed() {
    return this.state.tag === 'Closed'
  }

  // Accumulate Exit values
  protected setExit(exit: Exit<any, any>) {
    this._exit = pipe(this._exit, Maybe.reduce(exit, concatExits), Maybe.Just)
  }
}
