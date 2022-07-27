import { Strict } from 'hkt-ts/Typeclass/Eq'

import { Atomic } from '@/Atomic/Atomic.js'
import { Fx } from '@/Fx/Fx/Fx.js'

export interface Future<R, E, A> {
  readonly state: Atomic<FutureState<R, E, A>>
}

export type AnyFuture =
  | Future<any, any, any>
  | Future<never, never, any>
  | Future<never, any, any>
  | Future<any, never, any>

export type FutureState<R, E, A> = Pending<R, E, A> | Resolved<R, E, A>

export class Pending<R, E, A> {
  readonly tag = 'Pending'
  constructor(readonly observers: Atomic<ReadonlySet<(fx: Fx<R, E, A>) => void>>) {}
}

export class Resolved<R, E, A> {
  readonly tag = 'Resolved'

  constructor(readonly fx: Fx<R, E, A>) {}
}

export function isPendingState<R, E, A>(state: FutureState<R, E, A>): state is Pending<R, E, A> {
  return state.tag === 'Pending'
}

export function isResolvedState<R, E, A>(state: FutureState<R, E, A>): state is Resolved<R, E, A> {
  return state.tag === 'Resolved'
}

export const pending = <A, R = never, E = never>(): Future<R, E, A> => ({
  state: new Atomic<FutureState<R, E, A>>(
    new Pending(new Atomic<ReadonlySet<(fx: Fx<R, E, A>) => void>>(new Set(), Strict)),
    Strict,
  ),
})
