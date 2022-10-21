import * as Effect from '@effect/core/io/Effect'

import { Sink } from './Sink.js'

/**
 * TODOS:
 * Periodic
 * tap / tapEffect
 * tapError / tapErrorEffect
 * tapEnd / tapEndEffect
 * loop / scan
 * zipItems / withItems
 * TSemaphore integration
 * flatMapConcurrently
 * mergeAll
 * combine / combineAll
 * zip / zipAll
 * snapshot / sample
 * skipRepeats
 * slice / take / skip
 * takeWhile / skipWhile
 * takeUntil / skipUntil
 * takeAfter / skipAfter
 * until
 * since
 * during
 * Schedule integration
 * throttle
 * debounce
 * orElse / orElseEffect
 * multicast
 * hold
 */

export interface Stream<R, E, A, E1 = never> {
  readonly run: <R2, E2, B>(sink: Sink<E, A, R2, E2, B>) => Effect.Effect<R | R2, E1 | E2, B>
}

export function Stream<R, E, A, E1 = never>(run: Stream<R, E, A, E1>['run']): Stream<R, E, A, E1> {
  return { run }
}

export namespace Stream {
  export type ResourcesOf<T> = T extends Stream<infer R, any, any, any> ? R : never
  export type ErrorsOf<T> = T extends Stream<any, infer E, any, any> ? E : never
  export type OutputOf<T> = T extends Stream<any, any, infer A, any> ? A : never
  export type ReturnErrorsOf<T> = T extends Stream<any, any, any, infer E1> ? E1 : never
}
