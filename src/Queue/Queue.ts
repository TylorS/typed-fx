import { Maybe, pipe } from 'hkt-ts'
import { isNonEmpty } from 'hkt-ts/NonEmptyArray'
import { NonNegativeInteger } from 'hkt-ts/number'

import { QueueStrategy, runRemaining } from './QueueStrategy.js'

import { FiberId } from '@/FiberId/FiberId.js'
import { MutableFutureQueue } from '@/Future/MutableFutureQueue.js'
import * as Future from '@/Future/index.js'
import * as Fx from '@/Fx/Fx.js'

export interface Queue<out RI, out EI, in I, out RO, out EO, out O>
  extends Enqueue<RI, EI, I>,
    Dequeue<RO, EO, O> {}

export namespace Queue {
  export interface Of<A> extends Queue<never, never, A, never, never, A> {}
}

export interface Enqueue<out RI, out EI, in I> {
  readonly enqueue: (...inputs: readonly I[]) => Fx.Fx<RI, EI, boolean>

  readonly capacity: NonNegativeInteger
  readonly size: Fx.Of<NonNegativeInteger>
  readonly isShutdown: Fx.Of<boolean>
  readonly shutdown: Fx.Of<void>
}

export interface Dequeue<out RO, out RE, out O> {
  readonly poll: Fx.Fx<RO, RE, Maybe.Maybe<O>>
  readonly dequeue: Fx.Fx<RO, RE, O>
  readonly dequeueAll: Fx.Fx<RO, RE, ReadonlyArray<O>>
  readonly dequeueUpTo: (n: NonNegativeInteger) => Fx.Fx<RO, RE, ReadonlyArray<O>>

  readonly capacity: NonNegativeInteger
  readonly size: Fx.Of<NonNegativeInteger>
  readonly isShutdown: Fx.Of<boolean>
  readonly shutdown: Fx.Of<void>
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type EnqueueResources<T> = [T] extends [Enqueue<infer R, infer _, infer __>] ? R : unknown
export type DequeueResources<T> = [T] extends [Dequeue<infer R, infer _, infer __>] ? R : unknown

export type EnqueueErrors<T> = [T] extends [Enqueue<infer _, infer R, infer __>] ? R : unknown
export type DequeueErrors<T> = [T] extends [Dequeue<infer _, infer R, infer __>] ? R : unknown

export type EnqueueInput<T> = [T] extends [Enqueue<infer _, infer __, infer R>] ? R : unknown
export type DequeueOutput<T> = [T] extends [Dequeue<infer _, infer __, infer R>] ? R : unknown
/* eslint-enable @typescript-eslint/no-unused-vars */

export type AnyQueue = Queue<any, any, any, any, any, any>

export function Queue<A>(strategy: QueueStrategy<A>): Queue.Of<A> {
  const offers = MutableFutureQueue<never, never, A>()
  const takers = MutableFutureQueue<never, never, A>()
  const shutdownBy = Future.Pending<never, never, FiberId>()
  let mutableQueue: A[] = []

  const disposeIfShutdown = () => {
    const state = shutdownBy.state.get()

    if (state.tag === 'Resolved') {
      return pipe(
        state.fx,
        Fx.flatMap((id) => Fx.interrupted(id)),
      )
    }

    return Fx.unit
  }

  const size = Fx.fromLazy(() => NonNegativeInteger(mutableQueue.length))
  const isShutdown = Fx.fromLazy(() => shutdownBy.state.get().tag === 'Resolved')
  const shutdown = Fx.lazy(() =>
    pipe(
      disposeIfShutdown(),
      Fx.flatMap(() => Fx.getFiberId),
      Fx.tap((id) => strategy.onShutdown(mutableQueue, id, offers, takers)),
      Fx.tapLazy((id) => Future.complete(shutdownBy)(Fx.now(id))),
      Fx.mapTo(undefined),
    ),
  )

  const enqueue = (...values: A[]) =>
    pipe(
      disposeIfShutdown(),
      Fx.tapLazy(() =>
        // If there are takers waiting to dequeue a value push to them first
        runRemaining(values.splice(0, takers.size()), takers),
      ),
      Fx.flatMap(() =>
        values.length > 0
          ? strategy.offer(values, mutableQueue, offers)
          : Fx.now(values.length === 0),
      ),
    )

  const poll = Fx.lazy(() =>
    pipe(
      disposeIfShutdown(),
      Fx.flatMap(() => {
        if (isNonEmpty(mutableQueue)) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const value = mutableQueue.shift()!

          offers.next(Fx.now(value))

          return Fx.now(Maybe.Just<A>(value))
        }

        return Fx.now<Maybe.Maybe<A>>(Maybe.Nothing)
      }),
    ),
  )

  const dequeue = Fx.lazy(() =>
    pipe(
      disposeIfShutdown(),
      Fx.flatMap(() => {
        if (isNonEmpty(mutableQueue)) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const value = mutableQueue.shift()!

          offers.next(Fx.now(value))

          return Fx.now(value)
        }

        const [future] = takers.waitFor(NonNegativeInteger(1))

        return Future.wait(future)
      }),
    ),
  )

  const dequeueAll = Fx.lazy(() =>
    pipe(
      disposeIfShutdown(),
      Fx.flatMap(() => {
        const values = mutableQueue
        mutableQueue = []

        runRemaining(values.splice(0, offers.size()), offers)

        return Fx.now(values)
      }),
    ),
  )

  const dequeueUpTo = (n: NonNegativeInteger) =>
    pipe(
      disposeIfShutdown(),
      Fx.flatMap(() => {
        const values = mutableQueue.splice(0, n)

        runRemaining(values, offers)

        return Fx.now(values)
      }),
    )

  const queue: Queue<never, never, A, never, never, A> = {
    capacity: strategy.capacity,
    size,
    isShutdown,
    shutdown,
    enqueue,
    poll,
    dequeue,
    dequeueAll,
    dequeueUpTo,
  }

  return queue
}
