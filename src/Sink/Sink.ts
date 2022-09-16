import { flow, pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'

import { Cause } from '@/Cause/Cause.js'
import { Fx, IO, flatMap, getEnv, provide, unit } from '@/Fx/Fx.js'
import { Closeable } from '@/Scope/Closeable.js'

export interface Sink<E, A> {
  readonly event: (a: A) => IO<E, any>
  readonly error: (cause: Cause<E>) => IO<E, any>
  readonly end: IO<E, any>
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
): Fx<R2 | R3 | R4, never, Sink<E | E2 | E3 | E4, A>> {
  return Fx(function* () {
    const env = yield* getEnv<R2 | R3 | R4>()
    const drain = new Drain<E | E2 | E3 | E4, A>(scope)

    type O = Sink<E | E2 | E3 | E4, A>

    // TODO: Should drain always be called for error + end?
    const sink: O = {
      event: (fx.event ? flow(fx.event, provide(env)) : drain.event) as O['event'],
      error: (fx.error
        ? (a) =>
            pipe(
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              fx.error!(a as any),
              provide(env),
              flatMap(() => drain.error(a)),
            )
        : drain.error) as O['error'],
      end: (fx.end
        ? pipe(
            fx.end,
            provide(env),
            flatMap(() => drain.end),
          )
        : drain.end) as O['end'],
    }

    return sink
  })
}
