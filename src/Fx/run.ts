import { pipe } from 'hkt-ts'

import { Of, getFiberContext, map } from './Fx.js'

import { Atomic } from '@/Atomic/index.js'
import { AnyLiveFiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Platform } from '@/Platform/Platform.js'
import { Runtime } from '@/Runtime/index.js'
import { GlobalScope } from '@/Scope/GlobalScope.js'
import { trackIn } from '@/Supervisor/trackIn.js'

export const RootFibers = Atomic<ReadonlyMap<FiberId.Live, AnyLiveFiber>>(new Map())
export const MainSupervisor = trackIn(RootFibers)
export const MainPlatform = Platform()
export const MainRuntime = Runtime(
  FiberContext({
    platform: MainPlatform,
    id: FiberId.None as any,
    scope: GlobalScope,
    supervisor: MainSupervisor,
  }),
)

export const { run: runMain, runExit: runMainExit, runFiber: runMainFiber } = MainRuntime

export function getRuntime<R>(overrides?: Partial<FiberContext>): Of<Runtime<R>> {
  return pipe(
    getFiberContext,
    map((c) => Runtime({ ...c, ...overrides })),
  )
}
