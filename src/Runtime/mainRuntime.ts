import { Runtime } from './Runtime'

import { DateClock } from '@/Clock/Clock'
import { Env } from '@/Env/Env'
import { Platform } from '@/Platform/Platform'
import { DefaultScheduler } from '@/Scheduler/DefaultScheduler'
import { SetTimeoutTimer } from '@/Timer/SetTimeoutTimer'

export const MainRuntime = new Runtime({
  env: new Env<never>(),
  platform: new Platform(),
  scheduler: new DefaultScheduler(new SetTimeoutTimer(new DateClock())),
})

export const { run: runMain, runExit: runMainExit, runFiber: runMainFiber } = MainRuntime
