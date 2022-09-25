import { pipe } from 'hkt-ts'
import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberId } from '@/FiberId/FiberId.js'
import * as Future from '@/Future/index.js'
import * as Fx from '@/Fx/index.js'
import * as Queue from '@/Queue/index.js'
import type { Scope } from '@/Scope/Scope.js'

export interface Hub<R, E, I, R2, E2, O> extends Queue.Enqueue<R, E, I> {
  readonly subscribe: Fx.Fx<Scope, E, Queue.Dequeue<R2, E2, O>>
}

export namespace Hub {
  export interface Of<A> extends Hub<never, never, A, never, never, A> {}
}

export function Hub<A>(strategy: Queue.QueueStrategy<A>): Hub.Of<A> {
  const shutdownBy = Future.Pending<never, never, FiberId>()
  const subscribers: Map<symbol, Queue.Queue.Of<A>> = new Map()

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

  const withSubscriber = <R, E, B>(
    f: (sub: Queue.Queue.Of<A>) => Fx.Fx<R, E, B>,
  ): Fx.Fx<R, E, readonly B[]> => Fx.zipAll(Array.from(subscribers.values()).map(f))

  const size: Fx.Of<NonNegativeInteger> = pipe(
    withSubscriber((s) => s.size),
    Fx.map((sizes) => NonNegativeInteger(Math.min(...sizes))),
  )
  const isShutdown = Fx.fromLazy(() => shutdownBy.state.get().tag === 'Resolved')
  const shutdown = Fx.lazy(() =>
    pipe(
      disposeIfShutdown(),
      Fx.flatMap(() => Fx.getFiberId),
      Fx.tapLazy((id) => Future.complete(shutdownBy)(Fx.now(id))),
      Fx.mapTo(undefined),
    ),
  )

  const enqueue = (...values: readonly A[]) =>
    Fx.lazy(() =>
      pipe(
        disposeIfShutdown(),
        Fx.flatMap(() => withSubscriber((s) => s.enqueue(...values))),
        Fx.map((xs) => xs.every((x) => x)),
      ),
    )

  const subscribe = Fx.managed(
    Fx.lazy(() =>
      pipe(
        disposeIfShutdown(),
        Fx.flatMap(() =>
          Fx.fromLazy(() => {
            const id = Symbol(`HubSubscriber`)
            const queue = Queue.Queue(strategy)
            const subscriber: Queue.Queue.Of<A> = {
              ...queue,
              shutdown: pipe(
                queue.shutdown,
                Fx.tapLazy(() => subscribers.delete(id)),
              ),
            }

            subscribers.set(id, subscriber)

            return subscriber
          }),
        ),
      ),
    ),
    (d) =>
      pipe(
        d.isShutdown,
        Fx.flatMap((s) => (s ? Fx.unit : d.shutdown)),
      ),
  )

  const hub: Hub.Of<A> = {
    capacity: strategy.capacity,
    size,
    isShutdown,
    shutdown,
    enqueue,
    subscribe,
  }

  return hub
}

export const unbounded = <A>(): Hub.Of<A> => Hub<A>(Queue.makeUnboundedStategy())

export const dropping = <A>(capacity: NonNegativeInteger): Hub.Of<A> =>
  Hub<A>(Queue.makeDroppingStategy(capacity))

export const sliding = <A>(capacity: NonNegativeInteger): Hub.Of<A> =>
  Hub<A>(Queue.makeSlidingStategy(capacity))

export const suspend = <A>(capacity: NonNegativeInteger): Hub.Of<A> =>
  Hub<A>(Queue.makeSuspendStrategy(capacity))

export const localFx =
  <B, R3, E3, A>(f: (b: B) => Fx.Fx<R3, E3, A>) =>
  <R, E, R2, E2, O>(hub: Hub<R, E, A, R2, E2, O>): Hub<R | R3, E | E3, B, R2, E2, O> => ({
    ...hub,
    enqueue: (...values: readonly B[]) =>
      pipe(
        Fx.zipAll(values.map(f)),
        Fx.flatMap((as) => hub.enqueue(...as)),
      ),
  })

export const local =
  <B, A>(f: (b: B) => A) =>
  <R, E, R2, E2, O>(hub: Hub<R, E, A, R2, E2, O>): Hub<R, E, B, R2, E2, O> => ({
    ...hub,
    enqueue: (...values: readonly B[]) => hub.enqueue(...values.map(f)),
  })

export const map =
  <A, B>(f: (a: A) => B) =>
  <R, E, I, R2, E2>(hub: Hub<R, E, I, R2, E2, A>): Hub<R, E, I, R2, E2, B> => ({
    ...hub,
    subscribe: pipe(hub.subscribe, Fx.map(Queue.map(f)<R2, E2>)),
  })

export const mapFx =
  <A, R3, E3, B>(f: (a: A) => Fx.Fx<R3, E3, B>) =>
  <R, E, I, R2, E2>(hub: Hub<R, E, I, R2, E2, A>): Hub<R, E, I, R2 | R3, E2 | E3, B> => ({
    ...hub,
    subscribe: pipe(hub.subscribe, Fx.map(Queue.mapFx(f)<R2, E2>)),
  })

export const dimap =
  <A, B, C, D>(f: (a: A) => B, g: (c: C) => D) =>
  <R, E, R2, E2>(hub: Hub<R, E, B, R2, E2, C>): Hub<R, E, A, R2, E2, D> =>
    pipe(hub, map(g), local(f))

export const dimapFx =
  <A, B, R3, E3, C, R4, E4, D>(f: (a: A) => Fx.Fx<R3, E3, B>, g: (c: C) => Fx.Fx<R4, E4, D>) =>
  <R, E, R2, E2>(hub: Hub<R, E, B, R2, E2, C>): Hub<R | R3, E | E3, A, R2 | R4, E2 | E4, D> =>
    pipe(hub, mapFx(g), localFx(f))
