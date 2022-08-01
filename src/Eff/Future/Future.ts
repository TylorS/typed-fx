import { Strict } from 'hkt-ts/Typeclass/Eq'

import { Atomic } from '@/Atomic/Atomic.js'
import { Eff } from '@/Eff/Eff.js'

export interface Future<Y, R> {
  readonly state: Atomic<FutureState<Y, R>>
}

export type AnyFuture =
  | Future<any, any>
  | Future<never, never>
  | Future<never, any>
  | Future<any, never>

export type FutureState<Y, R> = Pending<Y, R> | Resolved<Y, R>

export class Pending<Y, R> {
  readonly tag = 'Pending'
  constructor(readonly observers: Atomic<ReadonlySet<(eff: Eff<Y, R>) => void>>) {}
}

export class Resolved<Y, R> {
  readonly tag = 'Resolved'

  constructor(readonly eff: Eff<Y, R>) {}
}

export function isPendingState<Y, R>(state: FutureState<Y, R>): state is Pending<Y, R> {
  return state.tag === 'Pending'
}

export function isResolvedState<Y, R>(state: FutureState<Y, R>): state is Resolved<Y, R> {
  return state.tag === 'Resolved'
}

export const pending = <Y, R>(): Future<Y, R> => ({
  state: new Atomic<FutureState<Y, R>>(
    new Pending(new Atomic<ReadonlySet<(eff: Eff<Y, R>) => void>>(new Set(), Strict)),
    Strict,
  ),
})
