import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Fiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { FiberRef } from '@/FiberRef/FiberRef.js'
import { update } from '@/FiberRef/operations.js'
import * as Fx from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Drain, Sink, makeDrain } from '@/Sink/Sink.js'

export function drain<R, E, A>(
  stream: Stream<R, E, A>,
  __trace?: string,
): Fx.Fx<R | Scheduler, never, Fiber<E, A>> {
  return pipe(
    Fx.Do,
    Fx.bind('fiberContext', () => Fx.getFiberContext),
    Fx.let('context', ({ fiberContext }) => fiberContext.fork()),
    Fx.let('sink', ({ context }) => new Drain<E, A>(context.scope)),
    Fx.flatMap(({ sink, context }) => fork(stream, sink, context), __trace),
  )
}

export function fork<R, E, A, E2 = never>(
  stream: Stream<R, E, A>,
  sink: Sink<E | E2, A>,
  context: FiberContext<FiberId.Live>,
): Fx.Fx<R | Scheduler, never, Fiber<E | E2, A>> {
  return Fx.asks(Scheduler)((scheduler) => stream.fork(sink, scheduler, context))
}

export function observe<A, R2, E2, B>(f: (a: A) => Fx.Fx<R2, E2, B>, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Fx.Fx<R | R2 | Scheduler, never, Fiber<E | E2, A>> =>
    pipe(
      Fx.Do,
      Fx.bind('fiberContext', () => Fx.getFiberContext),
      Fx.let('context', ({ fiberContext }) => fiberContext.fork()),
      Fx.bind('sink', ({ context }) => makeDrain<E, A, R2, E2>(context.scope, { event: f })),
      Fx.flatMap(({ sink, context }) => fork(stream, sink, context), __trace),
    )
}

export function collect<R, E, A>(
  stream: Stream<R, E, A>,
  __trace?: string,
): Fx.Fx<R | Scheduler, E, readonly A[]> {
  return pipe(
    Fx.fromLazy(() => FiberRef.make(Fx.now<readonly A[]>([]))),
    Fx.bindTo('fiberRef'),
    Fx.bind('fiberContext', () => Fx.getFiberContext),
    Fx.let('context', ({ fiberContext }) => fiberContext.fork()),
    Fx.bind('sink', ({ context, fiberRef }) =>
      makeDrain<E, A, R, E>(context.scope, {
        event: (a) =>
          pipe(
            fiberRef,
            update((as) => [...as, a]),
          ),
      }),
    ),
    Fx.flatMap(
      ({ sink, context, fiberRef }) =>
        pipe(
          fork(stream, sink, context),
          Fx.flatMap(Fx.join),
          Fx.flatMap(() => Fx.getFiberRef(fiberRef)),
        ),
      __trace,
    ),
  )
}
