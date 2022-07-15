import { Scheduler } from './Scheduler'
import { Timeline } from './Timeline'

import { Clock, Time } from '@/Clock/Clock'
import { Future, pending } from '@/Future/Future'
import { complete } from '@/Future/complete'
import { wait } from '@/Future/wait'
import { Fx } from '@/Fx/Fx'
import { success } from '@/Fx/index'
import { RuntimeFiberParams, getRuntime } from '@/Runtime/Runtime'
import { Schedule } from '@/Schedule/Schedule'
import { ScheduleState } from '@/Schedule/ScheduleState'

const completeFuture = complete(success<void>(void 0))

export class DefaultScheduler extends Scheduler {
  protected timeline: Timeline<Future<never, never, void>>
  protected timer: ReturnType<typeof setTimeout> | null = null
  protected nextArrival: Time | null = null

  constructor(readonly clock: Clock, timeline?: Timeline<Future<never, never, void>>) {
    // Create a Future which is inserted at a specific time in the Timeline

    super(clock, <R, E, A>(fx: Fx<R, E, A>, schedule: Schedule, params?: RuntimeFiberParams) => {
      const { addTask, scheduleNextRun } = this
      const scheduledFx = scheduled(fx, schedule, clock, addTask, scheduleNextRun)

      return Fx(function* () {
        // We need to create a Fiber
        const runtime = yield* getRuntime<R>()

        return runtime.runFiber(scheduledFx, params)
      })
    })

    this.timeline = timeline ?? new Timeline(this.scheduleNextRun)
  }

  readonly fork: () => Scheduler = () => new DefaultScheduler(this.clock.fork(), this.timeline)

  /**
   * If the Timeline is non-empty, schedules the next scheduled Fx
   */
  protected scheduleNextRun = () => {
    // If the timeline is empty, lets cleanup our resources
    if (this.timeline.isEmpty()) {
      this.cleanupTimer()
      this.nextArrival = null

      return
    }

    // Get the Time of the next arrival currently in the
    const nextArrival = this.timeline.nextArrival()
    const needToScheduleEarlierTime = !this.nextArrival || this.nextArrival > nextArrival

    if (needToScheduleEarlierTime) {
      this.cleanupTimer()
      this.timer = setTimeout(this.runReadyTasks, nextArrival)
      this.nextArrival = nextArrival
    }

    // The current time must be the earlier timer required still
  }

  protected addTask = (time: Time) => {
    const future = pending<void>()

    this.timeline.add(time, future)

    return future
  }

  protected cleanupTimer = () => {
    this.timer && clearTimeout(this.timer)
    this.timer = null
  }

  /**
   * Grabs all the ready task from the Timeline and completes them
   */
  protected runReadyTasks = () =>
    this.timeline.getReadyTasks(this.currentTime()).forEach(completeFuture)
}

function scheduled<R, E, A>(
  fx: Fx<R, E, A>,
  schedule: Schedule,
  clock: Clock,
  addTask: (time: Time) => Future<never, never, void>,
  scheduleNextRun: () => void,
) {
  return Fx(function* () {
    // Get our Starting state
    let [state, decision] = schedule.step(clock.currentTime(), new ScheduleState())

    // Run our Fx repeatedly until our
    while (decision.tag !== 'Done') {
      // If there's a non-zero delay, use the Timeline to schedule this work
      if (decision.delay > 0) {
        const future = addTask(Time(clock.currentTime() + decision.delay))

        scheduleNextRun()

        yield* wait(future) // Wait For Scheduler to decide when to run
      }

      yield* fx

      const next = schedule.step(clock.currentTime(), state)

      state = next[0]
      decision = next[1]
    }

    return state
  })
}
