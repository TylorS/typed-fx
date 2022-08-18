import { identity } from 'hkt-ts'

import { Env } from '@/Env/Env.js'
import { FiberContext } from '@/FiberContext/index.js'
import { Platform } from '@/Platform/Platform.js'
import { Runtime } from '@/Runtime/index.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { GlobalScope } from '@/Scope/GlobalScope.js'
import { Stack } from '@/Stack/index.js'
import { None } from '@/Supervisor/Supervisor.js'
import { EmptyTrace, Trace } from '@/Trace/Trace.js'

export const MainPlatform = Platform()
export const MainScheduler = RootScheduler(MainPlatform.timer)
export const MainRuntime = Runtime<never>({
  ...new FiberContext(MainPlatform, MainScheduler, None),
  env: Env.empty,
  scope: GlobalScope,
  trace: new Stack<Trace>(EmptyTrace),
  transform: identity,
})

export const { run: runMain, runExit: runMainExit, runFiber: runMainFiber } = MainRuntime
