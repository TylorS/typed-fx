import { isLeft } from 'hkt-ts/Either'

import { Stream } from './Stream.js'

import { Fiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/index.js'
import * as Fx from '@/Fx/index.js'
import * as Queue from '@/Queue/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

export function fromQueue<R, E, I, R2, E2, O>(
  queue: Queue.Queue<R, E, I, R2, E2, O>,
): Stream<R2, E2, O>

export function fromQueue<R2, E2, O>(queue: Queue.Dequeue<R2, E2, O>): Stream<R2, E2, O>

export function fromQueue<R2, E2, O>(queue: Queue.Dequeue<R2, E2, O>): Stream<R2, E2, O> {
  return Stream(
    <E3>(
      sink: Sink<E2, O, E3>,
      scheduler: Scheduler,
      context: FiberContext<FiberId.Live>,
    ): Fx.RIO<R2, Fiber<E3, unknown>> =>
      Fx.asksEnv<R2, Fiber<E3, unknown>>((env) =>
        scheduler.asap(
          Fx.Fx(function* () {
            while (!(yield* queue.isShutdown)) {
              const exit = yield* Fx.attempt(queue.dequeue)

              if (isLeft(exit)) {
                return yield* sink.error(exit.left)
              } else {
                yield* sink.event(exit.right)
              }
            }

            yield* sink.end
          }),
          env,
          context,
        ),
      ),
  )
}
