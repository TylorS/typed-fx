import { flow } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { Fiber } from '@/Fiber/Fiber.js'
import { ForkParams } from '@/Fx/Instructions/Fork.js'
import { Fx, RIO, uninterruptable } from '@/Fx/index.js'
import { SchedulerContext, forkSchedulerContext } from '@/Scheduler/Scheduler.js'
import { Drain, Sink, makeSink } from '@/Sink/Sink.js'

/**
 * Fork a Stream's process into a Fiber
 */
export const fork =
  <E, A, R, R2>(sink: Sink<E, A>, context: SchedulerContext<R | R2>) =>
  (stream: Stream<R, E, A>): Fiber<E, unknown> =>
    stream.fork(sink, context)

export const observe =
  <A, R2, E2>(f: (a: A) => Fx<R2, E2, any>, params?: ForkParams) =>
  <R, E>(stream: Stream<R, E, A>): RIO<R | R2, Fiber<E | E2, unknown>> =>
    Fx(function* () {
      const context = yield* forkSchedulerContext<R>(params)
      const sink = yield* makeSink<R2, E | E2, A>({
        scope: context.scope,
        event: flow(f, uninterruptable),
      })

      return stream.fork(sink, context)
    })

export const drain = <R, E, A>(
  stream: Stream<R, E, A>,
  params?: ForkParams,
): RIO<R, Fiber<E, unknown>> =>
  Fx(function* () {
    const context = yield* forkSchedulerContext<R>(params)

    return stream.fork(new Drain(context.scope), context)
  })
