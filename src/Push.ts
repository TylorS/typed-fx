import { Cause } from '@effect/core/io/Cause'
import { Effect } from '@effect/core/io/Effect'

export interface Push<R, E, A> {
  run<R2, E2>(emitter: Emitter<E, A, R2, E2>): Effect<R | R2, E2, unknown>
}

export function Push<R, E, A>(run: Push<R, E, A>['run']): Push<R, E, A> {
  return {
    run,
  }
}

export interface Emitter<E, A, R = never, E1 = never> {
  readonly event: (a: A) => Effect<R, E1, unknown>
  readonly error: (e: Cause<E>) => Effect<R, E1, unknown>
  readonly end: Effect<R, E1, unknown>
}

export function Emitter<E, A, R = never, E1 = never>(
  event: Emitter<E, A, R, E1>['event'],
  error: Emitter<E, A, R, E1>['error'],
  end: Emitter<E, A, R, E1>['end'],
): Emitter<E, A, R, E1> {
  return {
    event,
    error,
    end,
  }
}
