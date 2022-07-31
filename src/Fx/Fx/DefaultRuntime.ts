import { Nothing } from 'hkt-ts/Maybe'
import { NonNegative } from 'hkt-ts/number'

import { Environment } from '../Env/Env.js'
import { FiberId } from '../FiberId/FiberId.js'
import { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { Platform } from '../Platform/Platform.js'
import { make } from '../Runtime/Runtime.js'
import { RootScheduler } from '../Scheduler/RootScheduler.js'
import { GlobalScope } from '../Scope/GlobalScope.js'
import { SetTimeoutTimer } from '../Timer/SetTimeoutTimer.js'
import { EmptyTrace } from '../Trace/Trace.js'

export const MainRuntime = make(
  new Environment<never>(new Map<any, never>(), new Map(), new Map()),
  {
    id: FiberId.None,
    trace: EmptyTrace,
    fiberRefs: FiberRefs(),
    scheduler: RootScheduler(SetTimeoutTimer()),
    concurrencyLevel: NonNegative(Infinity),
    interruptStatus: true,
    platform: new Platform(),
    parent: Nothing,
  },
  GlobalScope,
)

export const { run: runMain, runExit: runMainExit, runFiber: runMainFiber } = MainRuntime
