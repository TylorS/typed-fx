import { pipe } from 'hkt-ts'

import { Of, getFiberContext, map } from './Fx.js'

import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Platform } from '@/Platform/Platform.js'
import { Runtime } from '@/Runtime/index.js'
import { GlobalScope } from '@/Scope/GlobalScope.js'

export const MainPlatform = Platform()
export const MainRuntime = Runtime(
  FiberContext({
    platform: MainPlatform,
    id: FiberId.None as any,
    scope: GlobalScope,
  }),
)

export const { run: runMain, runExit: runMainExit, runFiber: runMainFiber } = MainRuntime

export function getRuntime<R>(overrides?: Partial<FiberContext>): Of<Runtime<R>> {
  return pipe(
    getFiberContext,
    map((c) => Runtime({ ...c, ...overrides })),
  )
}
