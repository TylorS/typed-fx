import { Runtime } from './Runtime'

import { DateClock } from '@/Clock/Clock'
import { Env } from '@/Env/Env'
import { Platform } from '@/Platform/Platform'
import { DefaultScheduler } from '@/Scheduler/DefaultScheduler'
import { track } from '@/Supervisor/track'

export const MainRuntime = new Runtime({
  env: new Env<never>(),
  platform: new Platform(),
  supervisor: track(),
  scheduler: new DefaultScheduler(new DateClock()),
})

export const { run: runMain, runExit: runMainExit, runFiber: runMainFiber } = MainRuntime
