import { Left, isRight } from 'hkt-ts/Either'
import { First, concatAll } from 'hkt-ts/Typeclass/Associative'

import { Fx, attempt, fromExit, getFiberContext } from './Fx.js'

import { Empty } from '@/Cause/Cause.js'
import { Exit, makeSequentialAssociative } from '@/Exit/Exit.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'

const concatExits = concatAll(makeSequentialAssociative<any, any>(First))(Left(Empty))

export function retry(schedule: Schedule) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    Fx(function* () {
      const { platform } = yield* getFiberContext
      const { timer } = platform
      const exits: Array<Exit<E, A>> = []

      let [state, decision] = schedule.step(timer.getCurrentTime(), new ScheduleState())

      while (decision.tag === 'Continue') {
        // Schedule a Task to run the next iteration of this Fx
        const exit: Exit<E, A> = yield* attempt(fx)

        // Return a successful value immediately
        if (isRight(exit)) {
          return exit.right
        }

        // Track all failures.
        exits.push(exit)

        // Calculate if we should continue or not
        const [nextState, nextDecision] = schedule.step(timer.getCurrentTime(), state)
        state = nextState
        decision = nextDecision
      }

      // Return the final set of failures.
      return yield* fromExit(concatExits(exits))
    })
}
