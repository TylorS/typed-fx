import { Either } from 'hkt-ts'
import { Maybe } from 'hkt-ts/Maybe'

import { Env } from '@/Env/Env'
import { Exit } from '@/Exit/Exit'
import { FiberId } from '@/FiberId/FiberId'
import { FiberRefs } from '@/FiberRefs/FiberRefs'
import { FiberRuntime, FiberRuntimeParams } from '@/FiberRuntime/FiberRuntime'
import { fromFiberRuntime } from '@/FiberRuntime/fromFiberRuntime'
import { Fx } from '@/Fx/Fx'
import { Platform } from '@/Platform/Platform'
import { Scheduler } from '@/Scheduler/Scheduler'
import { Closeable } from '@/Scope/Scope'
import { Supervisor } from '@/Supervisor/Supervisor'

export type RuntimeParams<R> = {
  readonly environment: Env<R>
  readonly platform: Platform
  readonly scheduler: Scheduler
  readonly supervisor: Supervisor
  readonly fiberRefs: FiberRefs
  readonly scope: Closeable
  readonly parent: Maybe<FiberRuntime<any, any, any>>
}

export type RuntimeFiberParams = Partial<
  Omit<FiberRuntimeParams<any, any, any>, 'fx' | 'fiberId' | 'environment'>
>

export class Runtime<R> {
  constructor(readonly params: RuntimeParams<R>) {}

  readonly runExit = <E, A>(fx: Fx<R, E, A>, params?: RuntimeFiberParams) =>
    new Promise<Exit<E, A>>((resolve) => {
      const runtime = this.makeRuntime(fx, params)

      runtime.addObserver(resolve)
      runtime.start()
    })

  readonly run = <E, A>(fx: Fx<R, E, A>, params?: RuntimeFiberParams) =>
    new Promise<A>((resolve, reject) => {
      const runtime = this.makeRuntime(fx, params)

      runtime.addObserver(Either.match(reject, resolve))
      runtime.start()
    })

  readonly runFiber = <E, A>(fx: Fx<R, E, A>, params?: RuntimeFiberParams) => {
    const runtime = this.makeRuntime(fx, params)

    Promise.resolve().then(runtime.start)

    return fromFiberRuntime(runtime)
  }

  protected makeRuntime = <E, A>(fx: Fx<R, E, A>, params?: RuntimeFiberParams) => {
    const merged = {
      ...this.params,
      ...params,
    }

    return new FiberRuntime({
      fiberId: FiberId(
        this.params.platform.sequenceNumber.increment,
        this.params.scheduler.currentTime(),
      ),
      fx,
      ...merged,
    })
  }
}
