import { flow, pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/index.js'
import { Fiber } from '@/Fiber/Fiber.js'
import { fromScope } from '@/Fiber/fromScope.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import * as Fx from '@/Fx/index.js'
import { Runtime } from '@/Runtime/Runtime.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

export interface CallbackSink<E, A> {
  readonly event: (a: A) => Promise<any>
  readonly error: (cause: Cause<E>) => Promise<any>
  readonly end: () => Promise<any>
}

export function fromCallback<E = never, A = unknown>(
  f: (sink: CallbackSink<E, A>) => Finalizer | void | Promise<Finalizer | void>,
  __trace?: string,
): Stream<never, E, A> {
  return new FromCallback<E, A>(f, __trace)
}

export class FromCallback<E, A> implements Stream<never, E, A> {
  constructor(
    readonly f: (sink: CallbackSink<E, A>) => Finalizer | void | Promise<Finalizer | void>,
    readonly __trace?: string,
  ) {}

  fork = <R2, E2>(sink: Sink<E, A, R2, E2>): Fx.RIO<R2, Fiber<E2, any>> => {
    return Fx.lazy(() => {
      const { f, __trace } = this

      return pipe(
        Fx.getFiberContext,
        Fx.flatMap((fiberContext) => {
          const context = fiberContext.fork()
          const runtime = Runtime<R2>(context)
          const tracedSink = addTrace(sink, __trace)
          const cbSink: CallbackSink<E, A> = {
            event: flow(tracedSink.event, runtime.run),
            error: (cause) =>
              pipe(
                cause,
                tracedSink.error,
                Fx.tap(() => context.scope.close(Left(cause))),
                runtime.run,
              ),
            end: () =>
              pipe(
                tracedSink.end,
                Fx.tap(() => context.scope.close(Right(undefined))),
                runtime.run,
              ),
          }

          const synthetic = fromScope(
            new FiberId.Synthetic([context.id]),
            context.fiberRefs,
            context.scope,
          )

          return pipe(
            Fx.fromPromise(async () => await f(cbSink)),
            Fx.tap(
              (finalizer) =>
                (finalizer &&
                  (context.scope.state.tag === 'Open'
                    ? Fx.fromLazy(() => context.scope.ensuring(finalizer))
                    : finalizer(context.scope.state.exit))) ??
                Fx.unit,
            ),
            Fx.fork,
            Fx.map(() => synthetic),
          )
        }),
      )
    })
  }
}
