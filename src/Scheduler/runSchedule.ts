import * as Clock from '@/Clock/Clock.js'
import { Fx, unit } from '@/Fx/Fx.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Delay } from '@/Time/index.js'

/**
 * Runs an Fx on a given Schedule
 */
export function runSchedule<R, E, A, B>(
  fx: Fx<R, E, A>,
  schedule: Schedule,
  clock: Clock.Clock,
  runAt: (fx: Fx<R, E, A>, delay: Delay) => Fx<R, E, A>,
  onEnd?: (state: ScheduleState) => Fx<R, E, B>,
): Fx<R, E, ScheduleState> {
  return Fx(function* () {
    let [state, decision] = schedule.step(clock.getCurrentTime(), new ScheduleState())

    while (decision.tag === 'Continue') {
      // Schedule a Task to run the next iteration of this Fx
      yield* runAt(fx, decision.delay)

      // Calculate if we should continue or not
      const [nextState, nextDecision] = schedule.step(clock.getCurrentTime(), state)
      state = nextState
      decision = nextDecision
    }

    yield* onEnd?.(state) ?? unit

    // Return the final state
    return state
  })
}
