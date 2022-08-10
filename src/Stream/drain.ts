import { Stream } from './Stream.js'

import { Fiber } from '@/Fiber/Fiber.js'
import { Fx, ask } from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Drain, Sink, makeSink } from '@/Sink/Sink.js'

/**
 * Fork a Stream's process into a Fiber
 */
export const fork =
  <E, A>(sink: Sink<E, A>) =>
  <R>(stream: Stream<R, E, A>) =>
    Fx(function* () {
      const scheduler: Scheduler = yield* ask(Scheduler)

      return yield* stream.fork(sink, scheduler)
    })

export const observe =
  <A, R2, E2>(f: (a: A) => Fx<R2, E2, any>) =>
  <R, E>(stream: Stream<R, E, A>): Fx<R | R2 | Scheduler, never, Fiber<E | E2, unknown>> =>
    Fx(function* () {
      return yield* fork(yield* makeSink(f))(stream)
    })

export const drain = <R, E, A>(
  stream: Stream<R, E, A>,
): Fx<Scheduler | R, never, Fiber<E, unknown>> => fork<E, A>(Drain)(stream)
