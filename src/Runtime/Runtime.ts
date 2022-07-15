import { Either, flow } from 'hkt-ts'
import { fromNullable } from 'hkt-ts/Maybe'

import { Cause } from '@/Cause/Cause'
import { Env } from '@/Env/Env'
import { Exit } from '@/Exit/Exit'
import { FiberContext } from '@/FiberContext/index'
import { FiberId } from '@/FiberId/FiberId'
import { FiberRefs } from '@/FiberRefs/FiberRefs'
import { FiberRuntime, FiberRuntimeParams } from '@/FiberRuntime/index'
import { fromFiberRuntime } from '@/FiberRuntime/processors/forkFiberRuntime'
import { Fx } from '@/Fx/Fx'
import { get } from '@/Fx/InstructionSet/Access'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { Platform } from '@/Platform/Platform'
import { Scheduler } from '@/Scheduler/Scheduler'
import { SequentialStrategy } from '@/Scope/Finalizer'
import { LocalScope } from '@/Scope/LocalScope'
import { None } from '@/Supervisor/None'
import { Supervisor } from '@/Supervisor/Supervisor'

export type RuntimeParams<R> = {
  readonly env: Env<R>
  readonly platform: Platform
  readonly scheduler: Scheduler

  readonly supervisor?: Supervisor<any>
  readonly fiberRefs?: FiberRefs
  readonly parent?: FiberContext
}

export type RuntimeFiberParams = [
  Partial<Omit<FiberRuntimeParams<any>, 'env' | 'parent'>>,
] extends [infer R]
  ? { readonly [K in keyof R]: R[K] }
  : never

export class Runtime<R> {
  constructor(readonly params: RuntimeParams<R>) {}

  readonly runExit = <E, A>(fx: Fx<R, E, A>, params?: RuntimeFiberParams) =>
    new Promise<Exit<E, A>>((resolve) => {
      const runtime = this.makeFiberRuntime<E, A>(fx, params)

      runtime.addObserver(resolve)
      runtime.start()
    })

  readonly run = <E, A>(fx: Fx<R, E, A>, params?: RuntimeFiberParams) =>
    new Promise<A>((resolve, reject) => {
      const runtime = this.makeFiberRuntime(fx, params)

      runtime.addObserver(Either.match(flow(toCauseError, reject), resolve))
      runtime.start()
    })

  readonly runFiber = <E, A>(fx: Fx<R, E, A>, params?: RuntimeFiberParams) => {
    const runtime = this.makeFiberRuntime(fx, params)

    runtime.start()

    return fromFiberRuntime(runtime)
  }

  readonly forkDaemon = <E, A>(fx: Fx<R, E, A>, params?: Omit<RuntimeFiberParams, 'scope'>) => {
    const runtime = this.makeFiberRuntime(fx, params)

    runtime.start()

    return fromFiberRuntime(runtime)
  }

  readonly makeFiberRuntime = <E, A>(fx: Fx<R, E, A>, params?: RuntimeFiberParams) => {
    const merged = {
      ...this.params,
      ...params,
    }

    return new FiberRuntime(fx, {
      fiberId: FiberId(
        this.params.platform.sequenceNumber.increment,
        this.params.scheduler.currentTime(),
      ),
      scope: merged.scope ?? new LocalScope(SequentialStrategy),
      ...merged,
      parent: fromNullable(merged.parent),
      supervisor: merged.supervisor ?? None,
      fiberRefs: merged.fiberRefs ?? new FiberRefs(new Map()),
    })
  }
}

export function getRuntime<R>() {
  return Fx(function* () {
    const context = yield* getFiberContext
    const env = yield* get<R>()

    return new Runtime({
      env,
      platform: context.platform,
      scheduler: context.scheduler,
      parent: context,
    })
  })
}

export function toCauseError<E>(cause: Cause<E>) {
  return new CauseError(cause)
}

export class CauseError<E> extends Error {
  constructor(readonly causedBy: Cause<E>) {
    super(`TODO: Print the Cause : ${causedBy}`)
  }
}
