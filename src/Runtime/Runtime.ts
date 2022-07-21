import { Either, flow, pipe } from 'hkt-ts'
import { fromNullable } from 'hkt-ts/Maybe'

import { Cause, match } from '@/Cause/Cause'
import { Env } from '@/Env/Env'
import { Exit } from '@/Exit/Exit'
import { FiberContext } from '@/FiberContext/index'
import * as FiberId from '@/FiberId/FiberId'
import { FiberRefs } from '@/FiberRefs/FiberRefs'
import { FiberRuntime, FiberRuntimeParams } from '@/FiberRuntime/index'
import { fromFiberRuntime } from '@/FiberRuntime/processors/forkFiberRuntime'
import { Fx } from '@/Fx/Fx'
import { get } from '@/Fx/InstructionSet/Access'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { forkScope } from '@/Fx/forkScope'
import { join } from '@/Fx/join'
import { Platform } from '@/Platform/Platform'
import { Scheduler } from '@/Scheduler/Scheduler'
import { SequentialStrategy } from '@/Scope/Finalizer'
import { LocalScope } from '@/Scope/LocalScope'
import { None } from '@/Supervisor/None'
import { Supervisor } from '@/Supervisor/Supervisor'
import * as Trace from '@/Trace/index'

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

  readonly makeFiberRuntime = <E, A>(fx: Fx<R, E, A>, params?: RuntimeFiberParams) => {
    const merged = {
      ...this.params,
      ...params,
    }

    return new FiberRuntime(
      Fx(function* () {
        // We're already running in the right scope
        if (merged.scope || !merged.parent) {
          return yield* fx
        }

        // Run in a Forked Scope from Parent
        const { scope } = yield* getFiberContext
        const fiber = yield* forkScope(scope)(fx)
        return yield* join(fiber)
      }),
      {
        fiberId: FiberId.FiberId(
          this.params.platform.sequenceNumber.increment,
          this.params.scheduler.currentTime(),
        ),
        scope: merged.scope ?? merged.parent?.scope ?? new LocalScope(SequentialStrategy),
        ...merged,
        parent: fromNullable(merged.parent),
        supervisor: merged.supervisor ?? None,
        fiberRefs: merged.fiberRefs ?? new FiberRefs(new Map()),
      },
    )
  }

  readonly fork = <R2 = R>(params: Partial<RuntimeParams<R2>> = {}): Runtime<R2> =>
    new Runtime({ ...this.params, ...params } as RuntimeParams<R2>)
}

export function getRuntime<R>() {
  return Fx(function* () {
    const context = yield* getFiberContext
    const env = yield* get<R>()

    return new Runtime({
      env,
      platform: context.platform,
      scheduler: context.scheduler,
      fiberRefs: context.fiberRefs,
      parent: context,
    })
  })
}

export const printCause = <E>(cause: Cause<E>, shouldPrintStack = true): string => {
  return pipe(
    cause,
    match(
      () => 'Empty',
      (fiberId, trace) =>
        `${FiberId.Debug.debug(fiberId)}${shouldPrintStack ? `\n` + Trace.Debug.debug(trace) : ''}`,
      (error, trace) =>
        `${error instanceof Error ? error.message : JSON.stringify(error)}${
          shouldPrintStack ? `\n` + Trace.Debug.debug(trace) : ''
        }}`,
      (error, trace) =>
        `${error instanceof Error ? error.message : JSON.stringify(error)}${
          shouldPrintStack ? `\n` + Trace.Debug.debug(trace) : ''
        }}`,
      (left, right) => `${printCause(left)} <> ${printCause(right)}`,
      (left, right) => `${printCause(left)} => ${printCause(right)}`,
      (cause, shouldPrintStack) => printCause(cause, shouldPrintStack),
      (cause, trace) =>
        `${printCause(cause, shouldPrintStack)}${
          shouldPrintStack ? `\n` + Trace.Debug.debug(trace) : ''
        }}`,
    ),
  )
}

export function toCauseError<E>(cause: Cause<E>) {
  const error = new Error(printCause(cause))

  if (cause.tag === 'Died') {
    error.stack = Trace.Debug.debug(cause.trace)
  }

  throw error
}
