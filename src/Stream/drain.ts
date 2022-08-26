import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Fiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import * as Fx from '@/Fx/Fx.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Drain, Sink, makeDrain } from '@/Sink/Sink.js'

export function drain<R, E, A>(stream: Stream<R, E, A>): Fx.Fx<R | Scheduler, never, Fiber<E, A>> {
  return pipe(
    Fx.Do,
    Fx.bind('fiberContext', () => Fx.getFiberContext),
    Fx.let('context', ({ fiberContext }) => fiberContext.fork()),
    Fx.let('sink', ({ context }) => new Drain<E, A>(context.scope)),
    Fx.flatMap(({ sink, context }) => fork(stream, sink, context)),
  )
}

export function fork<R, E, A, E2 = never>(
  stream: Stream<R, E, A>,
  sink: Sink<E | E2, A>,
  context: FiberContext,
): Fx.Fx<R | Scheduler, never, Fiber<E | E2, A>> {
  return Fx.asks(Scheduler)((scheduler) => stream.fork(sink, scheduler, context))
}

export function observe<A, R2, E2, B>(f: (a: A) => Fx.Fx<R2, E2, B>) {
  return <R, E>(stream: Stream<R, E, A>): Fx.Fx<R | R2 | Scheduler, never, Fiber<E | E2, A>> =>
    pipe(
      Fx.Do,
      Fx.bind('fiberContext', () => Fx.getFiberContext),
      Fx.let('context', ({ fiberContext }) => fiberContext.fork()),
      Fx.bind('sink', ({ context }) => makeDrain<E, A, R2, E2>(context.scope, { event: f })),
      Fx.flatMap(({ sink, context }) => fork(stream, sink, context)),
    )
}
