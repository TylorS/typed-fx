import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'
import { observe } from './drain.js'

import { Fiber } from '@/Fiber/Fiber.js'
import * as Fx from '@/Fx/index.js'
import * as Queue from '@/Queue/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'

export function toQueue<R, E, I>(queue: Queue.Enqueue<R, E, I>) {
  return <R2, E2>(stream: Stream<R2, E2, I>): Fx.RIO<R | R2 | Scheduler, Fiber<E | E2, unknown>> =>
    pipe(stream, observe(queue.enqueue))
}
