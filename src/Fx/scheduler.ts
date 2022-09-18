import { pipe } from 'hkt-ts'
import { isRight } from 'hkt-ts/Either'

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
      let [state, decision] = schedule.step(timer.getCurrentTime(), new ScheduleState())

      const errors: Array<Cause.Cause<E>> = []

      while (decision.tag === 'Continue') {
        // Schedule a Task to run the next iteration of this Fx
        const exit: Exit<E, A> = yield* delayed(decision.delay)(Fx.attempt(fx))

        if (isRight(exit)) {
          return exit.right
        }

        errors.push(exit.left)

        // Calculate if we should continue or not
        const [nextState, nextDecision] = schedule.step(timer.getCurrentTime(), state)
        state = nextState
        decision = nextDecision
      }

      return yield* Fx.fromCause<E>(
        errors.reduce(Cause.makeSequentialAssociative<any>().concat, Cause.Empty),
      )
    })
  }
}

export function schedule(schedule: Schedule.Schedule) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>): Fx.Fx<R | Scheduler, never, Live<E, ScheduleState>> =>
    pipe(
      Fx.ask(Scheduler),
      Fx.bindTo('scheduler'),
      Fx.bind('env', () => Fx.getEnv<R>()),
      Fx.bind('context', () => Fx.getFiberContext),
      Fx.map(({ scheduler, env, context }) =>
        scheduler.schedule(fx, env, schedule, context.fork()),
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
    schedule(Schedule.delayed(delay)),
    Fx.flatMap(join),
    Fx.flatMap(() => Fx.getCurrentTime),
  )
