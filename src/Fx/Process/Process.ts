import { Maybe } from 'hkt-ts/Maybe'

import { Disposable } from '../Disposable/Disposable.js'
import { Eff, YieldOf } from '../Eff/Eff.js'
import { Exit } from '../Exit/Exit.js'
import { FiberId } from '../FiberId/FiberId.js'

import { Observer } from './Observer.js'

/**
 * An Process is an abstraction to represent a running Process that is used
 * to interpret an Eff that can potentially fail.
 * This can be potentially Sync or Async, and the result can be polled for,
 * listened for via callback, and potentially interrupted.
 */
export interface Process<T, Ctx, S, E, A> {
  readonly context: Eff<YieldOf<T>, Ctx>
  readonly state: Eff<YieldOf<T>, S>
  readonly poll: Eff<YieldOf<T>, Maybe<Exit<E, A>>>
  readonly exit: Eff<YieldOf<T>, Exit<E, A>>
  readonly addObserver: (observer: Observer<E, A>) => Disposable
  readonly interrupt: (id: FiberId) => Eff<YieldOf<T>, boolean>
}
