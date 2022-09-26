import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Fiber } from '@/Fiber/Fiber.js'
import * as Fx from '@/Fx/index.js'
import { Drain, makeDrain } from '@/Sink/Sink.js'

export function drain<R, E, A>(
  stream: Stream<R, E, A>,
  __trace?: string,
): Fx.Fx<R, never, Fiber<never, unknown>> {
  return pipe(
    Fx.Do,
    Fx.bind('fiberContext', () => Fx.getFiberContext),
    Fx.let('context', ({ fiberContext }) => fiberContext.fork()),
    Fx.let('sink', ({ context }) => new Drain<E, A>(context.scope)),
    Fx.flatMap(({ sink }) => stream.fork(sink), __trace),
  )
}

export function observe<A, R2, E2, B>(f: (a: A) => Fx.Fx<R2, E2, B>, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Fx.Fx<R | R2, never, Fiber<E | E2, unknown>> =>
    pipe(
      Fx.Do,
      Fx.bind('fiberContext', () => Fx.getFiberContext),
      Fx.let('context', ({ fiberContext }) => fiberContext.fork()),
      Fx.bind('sink', ({ context }) => makeDrain<E, A, R2, E2>(context.scope, { event: f })),
      Fx.flatMap(({ sink }) => stream.fork(sink), __trace),
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
