import { Platform } from './Platform.js'

import { TestTimer } from '@/Timer/TestTimer.js'

export interface TestPlatform extends Platform {
  readonly timer: TestTimer
}

export function TestPlatform(timer: TestTimer = TestTimer()): TestPlatform {
  return {
    ...Platform(undefined, undefined, undefined, timer),
    timer,
  }
}
