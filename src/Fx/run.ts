import { Nothing } from 'hkt-ts/Maybe'

import { Environment } from '@/Env/Env.js'
import { FiberContext } from '@/FiberContext/index.js'
import { Platform } from '@/Platform/Platform.js'
import { Runtime } from '@/Runtime/index.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { GlobalScope } from '@/Scope/GlobalScope.js'

export const MainPlatform = Platform()
export const MainScheduler = RootScheduler(MainPlatform.timer)
export const MainRuntime = Runtime<never>({
  ...new FiberContext(MainPlatform, MainScheduler),
  env: new Environment<never>(),
  scope: GlobalScope,
  trace: Nothing,
})

export const { run: runMain, runExit: runMainExit, runFiber: runMainFiber } = MainRuntime
