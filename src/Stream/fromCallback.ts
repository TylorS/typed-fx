import { flow, pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/index.js'
import { Fiber, Synthetic } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import * as Fx from '@/Fx/index.js'
import { Runtime } from '@/Runtime/Runtime.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { closeOrWait, wait } from '@/Scope/Closeable.js'
import { Sink } from '@/Sink/Sink.js'
import { Exit } from '@/index.js'

export interface CallbackSink<E, A> {
  readonly event: (a: A) => Fiber<E, any>
  readonly error: (cause: Cause<E>) => Fiber<E, any>
  readonly end: () => Fiber<E, any>
}

export function fromCallback<E, A>(
  f: (sink: CallbackSink<E, A>) => Finalizer,
): Stream<never, E, A> {
  return new FromCallback(f)
}

export class FromCallback<E, A> implements Stream<never, E, A> {
  constructor(readonly f: (sink: CallbackSink<E, A>) => Finalizer) {}

  fork = <E2>(
    sink: Sink<E | E2, A>,
    _: Scheduler,
    context: FiberContext<FiberId.Live>,
  ): Fx.RIO<never, Fiber<E | E2, any>> =>
    Fx.fromLazy(() => {
      const runtime = Runtime(context)
      const cbSink = {
        event: flow(sink.event, runtime.runFiber),
        error: flow(sink.error, runtime.runFiber),
        end: () => pipe(sink.end, runtime.runFiber),
      } as CallbackSink<E, A>

      context.scope.ensuring(this.f(cbSink))

      const synthetic = Synthetic({
        id: new FiberId.Synthetic([context.id]),
        exit: wait(context.scope),
        inheritFiberRefs: pipe(
          Fx.getFiberRefs,
          Fx.flatMap((refs) => Fx.fromLazy(() => FiberRefs.join(refs, context.fiberRefs))),
        ),
        interruptAs: (id) => closeOrWait(context.scope)(Exit.interrupt(id)),
      })

      return synthetic as Fiber<E | E2, any>
    })
}
