import { TestTimer } from './TestTimer'

import { Future } from '@/Future/Future'
import { DefaultScheduler } from '@/Scheduler/DefaultScheduler'
import { Timeline } from '@/Scheduler/Timeline'

export class TestScheduler extends DefaultScheduler {
  constructor(
    readonly timer: TestTimer = new TestTimer(),
    timeline?: Timeline<Future<never, never, void>>,
  ) {
    super(timer, timeline)
  }

  readonly progessTimeBy = this.timer.progessTimeBy
  readonly progessTimeTo = this.timer.progessTimeTo
}
