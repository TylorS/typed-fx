import { Stream } from './Stream.js'

import { Fiber } from '@/Fiber/Fiber.js'
import { ForkParams } from '@/Fx/Instructions/Fork.js'
import { Fx, RIO } from '@/Fx/index.js'
import { forkSchedulerContext } from '@/Scheduler/Scheduler.js'
import { Drain, Sink, makeSink } from '@/Sink/Sink.js'

/**
 * Fork a Stream's process into a Fiber
 */
export const fork =
  <E, A>(sink: Sink<E, A>, params?: ForkParams) =>
  <R>(stream: Stream<R, E, A>): RIO<R, Fiber<E, unknown>> =>
    Fx(function* () {
      return stream.fork(sink, yield* forkSchedulerContext<R>(params))
    })

export const observe =
  <A, R2, E2>(f: (a: A) => Fx<R2, E2, any>) =>
  <R, E>(stream: Stream<R, E, A>): RIO<R | R2, Fiber<E | E2, unknown>> =>
    Fx(function* () {
      return yield* fork(yield* makeSink(f))(stream)
    })

export const drain = <R, E, A>(stream: Stream<R, E, A>): RIO<R, Fiber<E, unknown>> =>
  fork<E, A>(Drain)(stream)
