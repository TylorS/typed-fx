import { TestTimer } from '../Timer/TestTimer.js'

import { RootScheduler } from './RootScheduler.js'
import { Scheduler } from './Scheduler.js'

import { TestClock } from '@/Clock/TestClock.js'
import { Service } from '@/Service/index.js'

export interface TestScheduler extends Scheduler, TestClock {}

export function TestScheduler(timer: TestTimer = TestTimer()): TestScheduler {
  const scheduler = RootScheduler(timer)

  return {
    ...scheduler,
    progressTimeBy: timer.progressTimeBy,
    progressTimeTo: timer.progressTimeTo,
  }
}

export namespace TestScheduler {
  export const service = Service<TestScheduler>(TestScheduler.name)
}
