import { isLeft } from 'hkt-ts/Either'

import { Stream } from './Stream.js'

import { Exit } from '@/Exit/Exit.js'
import { Fiber } from '@/Fiber/Fiber.js'
import * as Fx from '@/Fx/index.js'
import * as Queue from '@/Queue/index.js'
import { Sink } from '@/Sink/Sink.js'

export function fromQueue<R2, E2, O>(queue: Queue.Dequeue<R2, E2, O>): Stream<R2, E2, O>

export function fromQueue<R, E, I, R2, E2, O>(
  queue: Queue.Queue<R, E, I, R2, E2, O>,
): Stream<R2, E2, O>

export function fromQueue<R2, E2, O>(queue: Queue.Dequeue<R2, E2, O>): Stream<R2, E2, O> {
  return Stream(
    <R3, E3>(sink: Sink<E2, O, R3, E3>): Fx.RIO<R2 | R3, Fiber<E3, unknown>> =>
      Fx.fork(
        Fx.Fx(function* () {
          while (!(yield* queue.isShutdown)) {
            const exit: Exit<E2, O> = yield* Fx.attempt(queue.dequeue)

            if (isLeft(exit)) {
              return yield* sink.error(exit.left)
            } else {
              yield* sink.event(exit.right)
            }
          }

          yield* sink.end
        }),
      ),
  )
}
