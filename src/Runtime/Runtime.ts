import { match } from 'hkt-ts/Either'

import { CauseError } from '@/Cause/CauseError.js'
import { Exit } from '@/Exit/Exit.js'
import { Live } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime.js'
import { Fx } from '@/Fx/Fx.js'

export interface Runtime<R> {
  readonly runFiber: <E, A>(fx: Fx<R, E, A>) => Live<E, A>
  readonly runExit: <E, A>(fx: Fx<R, E, A>) => Promise<Exit<E, A>>
  readonly run: <E, A>(fx: Fx<R, E, A>) => Promise<A>
}

export function Runtime<R>(context: FiberContext): Runtime<R> {
  return {
    runFiber: <E, A>(fx: Fx<R, E, A>) => {
      const r = new FiberRuntime(fx, context.fork())

      r.startAsync()

      return r
    },
    runExit: <E, A>(fx: Fx<R, E, A>) =>
      new Promise<Exit<E, A>>((resolve) => {
        const r = new FiberRuntime(fx, context.fork())

        r.addObserver(resolve)
        r.startSync()

        return r
      }),
    run: <E, A>(fx: Fx<R, E, A>) =>
      new Promise<A>((resolve, reject) => {
        const r = new FiberRuntime(fx, context.fork())

        r.addObserver(match((cause) => reject(new CauseError(cause, context.renderer)), resolve))
        r.startSync()

        return r
      }),
  }
}
