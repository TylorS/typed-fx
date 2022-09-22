import { Fiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/Fx.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

/**
 * TODOS:
 * - Loop
 * - zipItems
 * - withItems
 * - concatMap
 * - combine/combineArray
 * - zip/zipArray
 * - sample
 * - snapshot
 * - skipRepeats
 * - slice/take/skip
 * - takeWhile/skipWhile
 * - takeUntil/skipUntil
 * - takeAfter/skipAfter
 * - since
 * - during
 * - until
 * - delay
 * - throttle
 * - debounce
 * - reduce
 * - Fusion/Commutation
 * - Unique Identification for streams to add to tracing
 *    - How to build a dynamic stream graph?
 */

export interface Stream<out R = never, out E = never, out A = unknown> {
  fork<E2 = never>(
    sink: Sink<E, A, E2>,
    scheduler: Scheduler,
    context: FiberContext<FiberId.Live>,
  ): Fx.RIO<R, Fiber<E2, any>>
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends Stream<infer R, infer _, infer __> ? R : never
export type ErrorsOf<T> = T extends Stream<infer _, infer E, infer __> ? E : never
export type OutputOf<T> = T extends Stream<infer _, infer __, infer A> ? A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface RIO<R, A> extends Stream<R, never, A> {}
export interface IO<E, A> extends Stream<never, E, A> {}
export interface Of<A> extends Stream<never, never, A> {}

export function Stream<R, E, A>(fork: Stream<R, E, A>['fork']): Stream<R, E, A> {
  return { fork }
}
