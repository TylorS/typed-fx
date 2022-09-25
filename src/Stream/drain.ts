import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Fiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/index.js'
import { Drain, Sink, addTrace, makeDrain } from '@/Sink/Sink.js'

export function drain<R, E, A>(
  stream: Stream<R, E, A>,
  __trace?: string,
): Fx.Fx<R, never, Fiber<never, unknown>> {
  return pipe(
    Fx.Do,
    Fx.bind('fiberContext', () => Fx.getFiberContext),
    Fx.let('context', ({ fiberContext }) => fiberContext.fork()),
    Fx.let('sink', ({ context }) => new Drain<E, A>(context.scope)),
    Fx.flatMap(({ sink, context }) => fork(stream, sink, context, __trace), __trace),
  )
}

export function fork<R, E, A, E2 = never>(
  stream: Stream<R, E, A>,
  sink: Sink<E, A, E2>,
  context: FiberContext<FiberId.Live>,
  __trace?: string,
): Fx.Fx<R, never, Fiber<E2, unknown>> {
  return stream.fork(addTrace(sink, __trace), context)
}

export function observe<A, R2, E2, B>(f: (a: A) => Fx.Fx<R2, E2, B>, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Fx.Fx<R | R2, never, Fiber<E | E2, unknown>> =>
    pipe(
      Fx.Do,
      Fx.bind('fiberContext', () => Fx.getFiberContext),
      Fx.let('context', ({ fiberContext }) => fiberContext.fork()),
      Fx.bind('sink', ({ context }) => makeDrain<E, A, R2, E2>(context.scope, { event: f })),
      Fx.flatMap(({ sink, context }) => fork(stream, sink, context, __trace), __trace),
    )
}

export function observeLazy<A, B>(f: (a: A) => B, __trace?: string) {
  return observe((a: A) => Fx.fromLazy(() => f(a)), __trace)
}

export function collect<R, E, A>(
  stream: Stream<R, E, A>,
  __trace?: string,
): Fx.Fx<R, E, readonly A[]> {
  return Fx.lazy(() => {
    const events: A[] = []

    return pipe(
      stream,
      observeLazy((a) => events.push(a)),
      Fx.flatJoinMap(() => events),
    )
  }, __trace)
}
