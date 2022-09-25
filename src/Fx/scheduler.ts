import { pipe } from 'hkt-ts'
import { Right, isRight } from 'hkt-ts/Either'
import { NonNegativeInteger } from 'hkt-ts/number'

import { join } from './join.js'

import * as Cause from '@/Cause/Cause.js'
import { Exit } from '@/Exit/Exit.js'
import { Live } from '@/Fiber/Fiber.js'
import * as Fx from '@/Fx/Fx.js'
import * as Schedule from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Delay, Time } from '@/Time/index.js'

/**
 * Runs an Fx on a given Schedule
 */
export function retry(schedule: Schedule.Schedule) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>): Fx.Fx<R | Scheduler, E, A> => {
    return Fx.Fx(function* () {
      const timer = yield* Fx.getTimer
      let [state, decision] = schedule.step(
        timer.getCurrentTime(),
        Right(undefined),
        new ScheduleState(),
      )

      const errors: Array<Cause.Cause<E>> = []

      while (decision.tag === 'Continue') {
        // Schedule a Task to run the next iteration of this Fx
        const exit: Exit<E, A> = yield* delayed(decision.delay)(Fx.attempt(fx))

        if (isRight(exit)) {
          return exit.right
        }

        errors.push(exit.left)

        // Calculate if we should continue or not
        const [nextState, nextDecision] = schedule.step(timer.getCurrentTime(), exit, state)
        state = nextState
        decision = nextDecision
      }

      return yield* Fx.fromCause<E>(
        errors.reduce(Cause.makeSequentialAssociative<any>().concat, Cause.Empty),
      )
    })
  }
}

export function scheduled(schedule: Schedule.Schedule, __trace?: string) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>): Fx.Fx<R | Scheduler, never, Live<E, ScheduleState>> =>
    pipe(
      Fx.ask(Scheduler),
      Fx.bindTo('scheduler'),
      Fx.bind('env', () => Fx.getEnv<R>()),
      Fx.bind('context', () => Fx.getFiberContext),
      Fx.map(
        ({ scheduler, env, context }) => scheduler.schedule(fx, env, schedule, context.fork()),
        __trace,
      ),
    )
}

export const delayed =
  (delay: Delay) =>
  <R, E, A>(fx: Fx.Fx<R, E, A>): Fx.Fx<R | Scheduler, E, A> =>
    pipe(
      sleep(delay),
      Fx.flatMap(() => fx),
    )

export const sleep = (delay: Delay): Fx.RIO<Scheduler, Time> =>
  pipe(
    Fx.unit,
    scheduled(Schedule.delayed(delay)),
    Fx.flatMap(join),
    Fx.flatMap(() => Fx.getCurrentTime),
  )

export function repeated(period: Delay, __trace?: string) {
  return <A>(value: A) => pipe(value, Fx.now, scheduled(Schedule.periodic(period), __trace))
}

export const exponential = (delay: Delay, __trace?: string) =>
  scheduled(Schedule.exponential(delay), __trace)

export const forever = scheduled(Schedule.forever, 'Scheduled.forever')

export const recurring = (amount: NonNegativeInteger, __trace?: string) =>
  scheduled(Schedule.recurring(amount), __trace)

export const retries = (amount: NonNegativeInteger, __trace?: string) =>
  scheduled(Schedule.retries(amount), __trace)

export const spaced = (delay: Delay, __trace?: string) => scheduled(Schedule.spaced(delay), __trace)
