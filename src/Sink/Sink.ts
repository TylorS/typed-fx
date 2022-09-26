import { flow, pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'

import { Cause } from '@/Cause/Cause.js'
import { Fx, access, addCustomTrace, flatMap, fromLazy, provide, unit } from '@/Fx/Fx.js'
import { Closeable } from '@/Scope/Closeable.js'

export interface Sink<in E, in A, out R2 = never, out E2 = never> {
  readonly event: (a: A) => Fx<R2, E2, any>
  readonly error: (cause: Cause<E>) => Fx<R2, E2, any>
  readonly end: Fx<R2, E2, any>
}

export class Drain<E, A> implements Sink<E, A> {
  constructor(readonly scope: Closeable) {}

  readonly event: Sink<E, A>['event'] = () => unit
  readonly error: Sink<E, A>['error'] = (cause) => this.scope.close(Left(cause))
  readonly end: Sink<E, A>['end'] = this.scope.close(Right(undefined))
}

export interface SinkFx<
  E,
  A,
  R2 = never,
  E2 = never,
  R3 = never,
  E3 = never,
  R4 = never,
  E4 = never,
> {
  readonly event?: (a: A) => Fx<R2, E2, any>
  readonly error?: (cause: Cause<E>) => Fx<R3, E3, any>
  readonly end?: Fx<R4, E4, any>
}

export function makeDrain<
  E,
  A,
  R2 = never,
  E2 = never,
  R3 = never,
  E3 = never,
  R4 = never,
  E4 = never,
>(
  scope: Closeable,
  fx: SinkFx<E, A, R2, E2, R3, E3, R4, E4>,
): Fx<R2 | R3 | R4, never, Sink<E, A, never, E2 | E3 | E4>> {
  return access((env) =>
    fromLazy(() => {
      const drain = new Drain<E, A>(scope)

      type O = Sink<E, A, never, E2 | E3 | E4>

      const sink: O = {
        event: fx.event ? flow(fx.event, provide(env)) : drain.event,
        error: fx.error
          ? (a) =>
              pipe(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                fx.error!(a as any),
                flatMap(() => drain.error(a)),
                provide(env),
              )
          : drain.error,
        end: fx.end
          ? pipe(
              fx.end,
              flatMap(() => drain.end),
              provide(env),
            )
          : drain.end,
      }

      return sink
    }),
  )
}

export function addTrace<E, A, R2, E2>(
  sink: Sink<E, A, R2, E2>,
  trace?: string,
): Sink<E, A, R2, E2> {
  if (trace === undefined) return sink

  return {
    event: flow(sink.event, addCustomTrace(trace)),
    error: flow(sink.error, addCustomTrace(trace)),
    end: pipe(sink.end, addCustomTrace(trace)),
  }
}
