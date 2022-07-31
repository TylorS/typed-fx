import { Either } from 'hkt-ts'

import { Env } from '../Env/Env.js'
import { Exit } from '../Exit/Exit.js'
import * as Fiber from '../Fiber/Fiber.js'
import { FiberContext } from '../FiberContext/FiberContext.js'
import * as FiberRuntime from '../FiberRuntime/FiberRuntime.js'
import { forkFiberContext } from '../FiberRuntime/fxInstructionToRuntimeInstruction.js'
import { Fx } from '../Fx/Fx.js'
import { Scope } from '../Scope/Scope.js'
import { CauseError } from '../Sync/run.js'

export interface Runtime<R> {
  readonly env: Env<R>
  readonly context: FiberContext
  readonly scope: Scope
  readonly runFiber: <E, A>(fx: Fx<R, E, A>) => Fiber.Live<E, A>
  readonly runExit: <E, A>(fx: Fx<R, E, A>) => Promise<Exit<E, A>>
  readonly run: <E, A>(fx: Fx<R, E, A>) => Promise<A>
}

export function make<R>(env: Env<R>, context: FiberContext, scope: Scope): Runtime<R> {
  const makeRuntime = <E, A>(fx: Fx<R, E, A>) =>
    FiberRuntime.make(fx, env, forkFiberContext(context), scope.fork())

  return {
    env,
    context,
    scope,
    runFiber: (fx) => FiberRuntime.toFiber(makeRuntime(fx)),
    runExit: (fx) =>
      new Promise((resolve) => {
        const runtime = makeRuntime(fx)

        runtime.addObserver(resolve)
        runtime.start()
      }),
    run: (fx) =>
      new Promise((resolve, reject) => {
        const runtime = makeRuntime(fx)

        runtime.addObserver(Either.match((cause) => reject(new CauseError(cause)), resolve))
        runtime.start()
      }),
  }
}
