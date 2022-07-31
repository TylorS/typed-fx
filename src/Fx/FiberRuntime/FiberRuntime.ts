import { Just, Nothing } from 'hkt-ts/Maybe'
import { pipe } from 'hkt-ts/function'

import { Disposable } from '../Disposable/Disposable.js'
import { Env } from '../Env/Env.js'
import { Exit, interrupt } from '../Exit/Exit.js'
import { Live } from '../Fiber/Fiber.js'
import { FiberContext } from '../FiberContext/FiberContext.js'
import { FiberId } from '../FiberId/FiberId.js'
import * as Future from '../Future/index.js'
import { Fx, Of, fromLazy, success } from '../Fx/Fx.js'
import { provide } from '../Fx/Instruction/Provide.js'
import * as Closeable from '../Scope/Closeable.js'
import { Semaphore } from '../Semaphore/Semaphore.js'
import { StackTrace } from '../StackTrace/StackTrace.js'

import { InstructionProcessor } from './InstructionProcessor.js'
import { RuntimeFiberContext } from './RuntimeFiberContext.js'
// eslint-disable-next-line import/no-cycle
import { fxInstructionToRuntimeInstruction } from './fxInstructionToRuntimeInstruction.js'

import { Stack } from '@/Stack/index.js'

export interface FiberRuntime<R, E, A> {
  readonly fx: Fx<R, E, A>
  readonly env: Env<R>
  readonly context: FiberContext
  readonly scope: Closeable.Closeable

  readonly start: () => void
  readonly addObserver: (cb: (exit: Exit<E, A>) => void) => Disposable
  readonly interrupt: (id: FiberId) => Of<Exit<E, A>>
}

export function make<R, E, A>(
  fx: Fx<R, E, A>,
  env: Env<R>,
  context: FiberContext,
  scope: Closeable.Closeable,
): FiberRuntime<R, E, A> {
  const ctx: RuntimeFiberContext = {
    env,
    concurrencyLevel: new Semaphore(context.concurrencyLevel),
    interruptStatus: context.interruptStatus,
    trace: new StackTrace(new Stack(context.trace)),
    instructionCount: 0,
  }
  const processor = new InstructionProcessor(
    ctx,
    fx,
    context.scheduler,
    (i, ctx, ids) => fxInstructionToRuntimeInstruction(i, ctx, ids, context, scope),
    scope.close,
    (cb) =>
      Fx(function* () {
        cb(yield* Closeable.wait(scope))
      }),
    (fx, ctx) => scope.ensuring(() => pipe(fx, provide(ctx.env)) as Of<unknown>),
    (ctx: RuntimeFiberContext, id: FiberId) =>
      ctx.interruptStatus ? Just(scope.close(interrupt(id))) : Nothing,
  )

  const runtime: FiberRuntime<R, E, A> = {
    fx,
    env,
    context,
    scope,
    start: processor.start,
    addObserver: processor.addObserver,
    interrupt: processor.interrupt,
  }

  return runtime
}

export function toFiber<R, E, A>(runtime: FiberRuntime<R, E, A>): Live<E, A> {
  const future = Future.pending<Exit<E, A>>()

  runtime.addObserver((exit) => Future.complete(future)(success(exit)))

  return Live(
    runtime.context.id,
    fromLazy(() => runtime.context),
    Future.wait(future),
    runtime.scope,
  )
}
