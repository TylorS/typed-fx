import { gracefulShutdown } from './gracefulShutdown.js'

import { Atomic } from '@/Atomic/index.js'
import { AnyLiveFiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { MainPlatform } from '@/Fx/run.js'
import { Runtime } from '@/Runtime/Runtime.js'
import { GlobalScope } from '@/Scope/GlobalScope.js'

export const NodeFibers = Atomic<ReadonlyMap<FiberId.Live, AnyLiveFiber>>(new Map())
export const NodeSupervisor = gracefulShutdown(NodeFibers)
export const NodeRuntime = Runtime(
  FiberContext({
    platform: MainPlatform,
    id: FiberId.None,
    scope: GlobalScope,
    supervisor: NodeSupervisor,
  }),
)

export const {
  run: runMainNode,
  runExit: runMainNodeExit,
  runFiber: runMainNodeFiber,
} = NodeRuntime
