import { flow, pipe } from 'hkt-ts'
import { Either } from 'hkt-ts/Either'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/Cause.js'
import * as Exit from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/index.js'
import * as Fx from '@/Fx/Fx.js'
import { Sink } from '@/Sink/Sink.js'

/**
 * Constructs a Stream from an Fx that runs within a LogSpan enabling
 */
export function fromFx<R, E, A>(fx: Fx.Fx<R, E, A>, __trace?: string): Stream<R, E, A> {
  return new FromFxStream(fx, __trace)
}

export class FromFxStream<R, E, A> implements Stream<R, E, A> {
  constructor(readonly fx: Fx.Fx<R, E, A>, readonly __trace?: string) {}

  fork<R2, E2>(sink: Sink<E, A, R2, E2>) {
    return Fx.fork(
      pipe(
        this.fx,
        Fx.matchCause(
          sink.error,
          flow(
            sink.event,
            Fx.tap(() => sink.end),
          ),
        ),
      ),
      this.__trace,
    )
  }
}

export const now = <A>(value: A, __trace?: string) => fromFx(Fx.now(value), __trace)

export const fromCause = <E>(cause: Cause<E>, __trace?: string) =>
  fromFx(Fx.fromCause(cause), __trace)

export const fromExit = <E, A>(exit: Exit.Exit<E, A>, __trace?: string) =>
  fromFx(Fx.fromExit(exit), __trace)

export const interrupt = (id: FiberId, __trace?: string) => fromExit(Exit.interrupt(id), __trace)

export const unexpected = (error: unknown, __trace?: string) =>
  fromExit(Exit.unexpected(error), __trace)

export const expected = <E>(error: E, __trace?: string) => fromExit(Exit.expected(error), __trace)

export const fromPromise = <A>(promise: () => Promise<A>, __trace?: string) =>
  fromFx(Fx.fromPromise(promise), __trace)

export const fromLazy = <A>(lazy: () => A, __trace?: string) => fromFx(Fx.fromLazy(lazy), __trace)

export const fromEither = <E, A>(either: Either<E, A>, __trace?: string) =>
  fromFx(Fx.fromEither(either), __trace)

export const never = fromFx(Fx.never, 'never')
