import * as Clock from '@/Clock/Clock.js'
import { Fx } from '@/Fx/Fx.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { UnixTime } from '@/Time/index.js'

/**
 * Runs an Fx on a given Schedule
 */
export function scheduled<R, E, A>(
  fx: Fx<R, E, A>,
  schedule: Schedule,
  clock: Clock.Clock,
  runAt: (fx: Fx<R, E, A>, time: UnixTime) => Fx<R, E, A>,
) {
  return Fx(function* () {
    let [state, decision] = schedule.step(clock.getCurrentTime(), new ScheduleState())

    while (decision.tag === 'Continue') {
      // Schedule a Task to run the next iteration of this Fx
      yield* runAt(fx, Clock.delayToUnixTime(decision.delay)(clock))

      // Calculate if we should continue or not
      const [nextState, nextDecision] = schedule.step(clock.getCurrentTime(), state)
      state = nextState
      decision = nextDecision
    }

    // Return the final state
    return state
  })
}
