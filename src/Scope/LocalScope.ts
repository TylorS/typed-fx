import * as Maybe from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Closeable } from './Closeable.js'
import { ReleaseMap } from './ReleaseMap.js'
import { Closed, Closing, Open, ScopeState } from './ScopeState.js'

import { AtomicCounter, decrement, increment } from '@/Atomic/AtomicCounter.js'
import { Exit, makeSequentialAssociative } from '@/Exit/Exit.js'
import { FinalizationStrategy, Finalizer } from '@/Finalizer/Finalizer.js'
import { Fx, Of, lazy, success, unit } from '@/Fx/Fx.js'

const { concat: concatExits } = makeSequentialAssociative<any, any>(First)

export class LocalScope implements Closeable {
  protected _state: ScopeState = Open
  protected _releaseMap = new ReleaseMap(this.strategy)
  protected _refCount = AtomicCounter(NonNegativeInteger(1))
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

    // Mutually track resources
    extended.ensuring(this.ensuring(() => extended.release))
    extended.ensuring(() => this.release)
    increment(this._refCount)

    return extended
  }

  readonly close = (exit: Exit<any, any>): Of<boolean> =>
    lazy(() => {
      this.setExit(exit)

      return this.release
    })

  // Internals

  protected release = lazy(() => {
    if (decrement(this._refCount) > 0 || Maybe.isNothing(this._exit)) {
      return success(false)
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this
    const exit = this._exit.value

    return Fx(function* () {
      that._state = Closing(exit)

      yield* that._releaseMap.releaseAll(exit)

      that._state = Closed(exit)

      return true
    })
  })

  protected get isClosed() {
    return this.state.tag === 'Closed'
  }

  // Accumulate Exit values
  protected setExit(exit: Exit<any, any>) {
    this._exit = pipe(this._exit, Maybe.reduce(exit, concatExits), Maybe.Just)
  }
}
