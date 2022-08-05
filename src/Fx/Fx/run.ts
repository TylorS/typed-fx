import { Nothing } from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Environment } from '../Env/Env.js'
import { FiberContext } from '../FiberContext/index.js'
import { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { Runtime } from '../Runtime/Runtime.js'
import { GlobalScope } from '../Scope/GlobalScope.js'

import { Platform } from '@/Platform/Platform.js'

export const mainEnv = new Environment<never>()
export const mainFiberContext: FiberContext = {
  fiberRefs: FiberRefs(),
  concurrencyLevel: NonNegativeInteger(Infinity),
  interruptStatus: true,
  platform: Platform(),
  parent: Nothing,
}

export const MainRuntime = Runtime<never>({
  env: mainEnv,
  context: mainFiberContext,
  scope: GlobalScope,
  trace: Nothing,
})

export const { run: runMain, runExit: runMainExit, runFiber: runMainFiber } = MainRuntime
