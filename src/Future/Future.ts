import { Atomic } from '@/Atomic/Atomic'
import { Fx } from '@/Fx/Fx'
import { Service } from '@/Service/Service'

export interface Future<R extends Service<any>, E, A> {
  readonly state: Atomic<FutureState<R, E, A>>
}

export type FutureState<R extends Service<any>, E, A> = Pending<R, E, A> | Resolved<R, E, A>

export interface Pending<R extends Service<any>, E, A> {
  readonly tag: 'Pending'
  readonly observers: Atomic<ReadonlySet<(fx: Fx<R, E, A>) => void>>
}

export interface Resolved<R extends Service<any>, E, A> {
  readonly tag: 'Resolved'
  readonly fx: Fx<R, E, A>
}

export function isPendingState<R extends Service<any>, E, A>(
  state: FutureState<R, E, A>,
): state is Pending<R, E, A> {
  return state.tag === 'Pending'
}

export function isResolvedState<R extends Service<any>, E, A>(
  state: FutureState<R, E, A>,
): state is Resolved<R, E, A> {
  return state.tag === 'Resolved'
}
