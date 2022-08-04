import { Nothing } from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Environment } from '../Env/Env.js'
import { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { Runtime } from '../Runtime/Runtime.js'
import { GlobalScope } from '../Scope/GlobalScope.js'

import { FiberId } from '@/FiberId/FiberId.js'
import { Platform } from '@/Platform/Platform.js'

export const MainRuntime = Runtime<never>({
  env: new Environment<never>(),
  context: {
    id: FiberId.None,
    fiberRefs: FiberRefs(),
    concurrencyLevel: NonNegativeInteger(Infinity),
    interruptStatus: true,
    platform: Platform(),
    parent: Nothing,
  },
  scope: GlobalScope,
  trace: Nothing,
})

export const { run: runMain, runExit: runMainExit, runFiber: runMainFiber } = MainRuntime
