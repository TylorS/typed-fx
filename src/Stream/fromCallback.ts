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
  readonly event: (a: A) => Promise<any>
  readonly error: (cause: Cause<E>) => Promise<any>
  readonly end: () => Promise<any>
}

export function fromCallback<E, A>(
  f: <E2>(sink: CallbackSink<E | E2, A>) => Finalizer | void | Promise<Finalizer | void>,
): Stream<never, E, A> {
  return new FromCallback<E, A>(f)
}

export class FromCallback<E, A> implements Stream<never, E, A> {
  constructor(
    readonly f: <E2>(sink: CallbackSink<E | E2, A>) => Finalizer | void | Promise<Finalizer | void>,
  ) {}

  fork = <E2>(
    sink: Sink<E | E2, A>,
    _: Scheduler,
    context: FiberContext<FiberId.Live>,
  ): Fx.RIO<never, Fiber<E | E2, any>> =>
    Fx.fromPromise(async () => {
      const runtime = Runtime(context)
      const cbSink = {
        event: flow(sink.event, runtime.run),
        error: flow(sink.error, runtime.run),
        end: () => pipe(sink.end, runtime.run),
      }
      const finalizer = await this.f(cbSink)

      if (finalizer) {
        context.scope.ensuring(finalizer)
      }

      const synthetic = Synthetic({
        id: context.id,
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
