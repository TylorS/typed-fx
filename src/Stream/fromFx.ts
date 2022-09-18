import { flow, pipe } from 'hkt-ts'
import { Either } from 'hkt-ts/Either'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/Cause.js'
import { Env } from '@/Env/Env.js'
import { Exit } from '@/Exit/Exit.js'
import * as Fx from '@/Fx/Fx.js'

/**
 * Constructs a Stream from an Fx that runs within a LogSpan enabling
 */
export function fromFx<R, E, A>(fx: Fx.Fx<R, E, A>, __trace?: string): Stream<R, E, A> {
  return Stream((sink, scheduler, context) =>
    Fx.asksEnv(
      (env: Env<R>) =>
        scheduler.asap(
          pipe(
            fx,
            Fx.matchCause(
              sink.error,
              flow(
                sink.event,
                Fx.flatMap(() => sink.end),
              ),
              __trace,
            ),
          ),
          env,
          context,
        ),
      __trace,
    ),
  )
}

export const now = <A>(value: A, __trace?: string) => fromFx(Fx.now(value), __trace)

export const fromCause = <E>(cause: Cause<E>, __trace?: string) =>
  fromFx(Fx.fromCause(cause), __trace)

export const fromExit = <E, A>(exit: Exit<E, A>, __trace?: string) =>
  fromFx(Fx.fromExit(exit), __trace)

export const fromPromise = <A>(promise: () => Promise<A>, __trace?: string) =>
  fromFx(Fx.fromPromise(promise), __trace)

export const fromLazy = <A>(lazy: () => A, __trace?: string) => fromFx(Fx.fromLazy(lazy), __trace)

export const fromEither = <E, A>(either: Either<E, A>, __trace?: string) =>
  fromFx(Fx.fromEither(either), __trace)

export const never = fromFx(Fx.never, 'never')
