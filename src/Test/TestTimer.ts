import { constVoid } from 'hkt-ts'

import { TestClock } from './TestClock'

import { Time } from '@/Clock/Clock'
import { Timeline } from '@/Scheduler/Timeline'
import { Delay, Timer } from '@/Timer/Timer'

export class TestTimer extends Timer {
  protected timeline: Timeline<() => void> = new Timeline(constVoid)

  constructor(readonly clock: TestClock = new TestClock(new Date())) {
    super(clock, (f, delay) => {
      const time = Time(this.clock.currentTime() + delay)
      this.timeline.add(time, f)

      return () => this.timeline.remove(time, f)
    })
  }

  readonly progessTimeBy = (delay: Delay): Time => {
    const time = this.clock.progessTimeBy(delay)

    this.runReadyTasks()

    return time
  }

  readonly progessTimeTo = (time: Time): Time => {
    const next = this.clock.progessTimeTo(time)

    this.runReadyTasks()

    return next
  }

  protected runReadyTasks() {
    this.timeline.getReadyTasks(this.currentTime()).forEach((f) => f())
  }
}
