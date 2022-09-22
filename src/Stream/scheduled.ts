import { pipe } from 'hkt-ts'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import * as Fx from '@/Fx/index.js'
import * as Schedule from '@/Schedule/Schedule.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'
import { Delay } from '@/Time/index.js'
import { FiberId } from '@/index.js'

export function scheduled(schedule: Schedule.Schedule, __trace?: string) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> =>
    Stream(<E2>(sink: Sink<E, A, E2>, scheduler: Scheduler, context: FiberContext<FiberId.Live>) =>
      pipe(
        Fx.asksEnv(
          (env: Env<R>) =>
            scheduler.schedule(
              Fx.matchCause(sink.error, sink.event, __trace)(fx),
              env,
              schedule,
              context,
              () => sink.end,
            ),
          __trace,
        ),
      ),
    )
}

export function at(delay: Delay, __trace?: string) {
  return <A>(value: A): Stream<never, never, A> =>
    scheduled(Schedule.delayed(delay), __trace)(Fx.now(value))
}

export function repeated(period: Delay, __trace?: string) {
  return <A>(value: A): Stream<never, never, A> =>
    scheduled(Schedule.periodic(period), __trace)(Fx.now(value))
}

export const exponential = (delay: Delay, __trace?: string) =>
  scheduled(Schedule.exponential(delay), __trace)

export const forever = scheduled(Schedule.forever, 'Scheduled.forever')

export const recurring = (amount: NonNegativeInteger, __trace?: string) =>
  scheduled(Schedule.recurring(amount), __trace)

export const retries = (amount: NonNegativeInteger, __trace?: string) =>
  scheduled(Schedule.retries(amount), __trace)

export const spaced = (delay: Delay, __trace?: string) => scheduled(Schedule.spaced(delay), __trace)
