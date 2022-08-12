import * as Maybe from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'

import { Closeable } from './Closeable.js'
import { ReleaseMap } from './ReleaseMap.js'
import { Closed, Closing, Open, ScopeState } from './ScopeState.js'

import { Exit, makeSequentialAssociative } from '@/Exit/Exit.js'
import { FinalizationStrategy, Finalizer } from '@/Finalizer/Finalizer.js'
import { Fx, Of, lazy, success, unit } from '@/Fx/Fx.js'

const { concat: concatExits } = makeSequentialAssociative<any, any>(First)

export class LocalScope implements Closeable {
  #state: ScopeState = Open
  #releaseMap = new ReleaseMap(this.strategy)
  #exit: Maybe.Maybe<Exit<any, any>> = Maybe.Nothing

  constructor(readonly strategy: FinalizationStrategy) {}

  get state(): ScopeState {
    return this.#state
  }

  readonly ensuring: (finalizer: Finalizer) => Finalizer = (finalizer) => {
    if (this.isClosed) {
      return (() => unit) as Finalizer
    }

    const key = this.#releaseMap.add(finalizer)

    return (exit) => this.#releaseMap.release(key, exit)
  }

  readonly fork = (strategy: FinalizationStrategy = this.strategy): LocalScope => {
    if (this.isClosed) {
      throw new Error(`Unable to Fork a Closed Scope`)
    }

    const extended = new LocalScope(strategy)

    // Mutually track resources
    extended.ensuring(this.ensuring(() => extended.release))

    return extended
  }

  readonly close = (exit: Exit<any, any>): Of<boolean> =>
    lazy(() => {
      console.log('Closing Scope')
      this.setExit(exit)

      return this.release
    })

  // Internals

  protected release = lazy(() => {
    if (Maybe.isNothing(this.#exit)) {
      return success(false)
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this
    const exit = this.#exit.value

    return Fx(function* () {
      that.#state = Closing(exit)

      yield* that.#releaseMap.releaseAll(exit)

      that.#state = Closed(exit)

      return true
    })
  })

  protected get isClosed() {
    return this.#state.tag === 'Closed'
  }

  // Accumulate Exit values
  protected setExit(exit: Exit<any, any>) {
    this.#exit = pipe(this.#exit, Maybe.reduce(exit, concatExits), Maybe.Just)
  }
}
