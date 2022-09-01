import { Lazy, Variance, flow, pipe } from 'hkt-ts'
import { First } from 'hkt-ts/Typeclass/Associative'

import type { Future } from './Future.js'

import type { Cause } from '@/Cause/index.js'
import { Exit, makeSequentialAssociative } from '@/Exit/Exit.js'
import * as IO_ from '@/IO/IO.js'
import { Tagged } from '@/Tagged/index.js'

export type Fx<R, E, A> = FxTagged<R, IO_.IO<E, A>>

export type IO<E, A> = Fx<never, E, A>
export type RIO<R, A> = Fx<R, never, A>
export type Of<A> = IO<never, A>

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _R : never
export type ErrorsOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _E : never
export type OutputOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export type FxTagged<R, T> = Tagged<FxTag<R>, T>
export type FxTag<R> = { readonly Fx: Variance.Covariant<R> }

const concatExitSeq = makeSequentialAssociative<any, any>(First).concat

export function fromIO<E, A>(io: IO_.IO<E, A>): Fx<never, E, A> {
  return io as Fx<never, E, A>
}

export const now = flow(IO_.Now.make, fromIO)

export const fromLazy = flow(IO_.FromLazy.make, fromIO)

export const fromCause = flow(IO_.FromCause.make, fromIO)

export const fromExit = <E, A>(exit: Exit<E, A>, __trace?: string) =>
  exit.tag === 'Left' ? fromCause(exit.left, __trace) : now(exit.right, __trace)

export const lazy = IO_.LazyIO.make as <R, E, A>(
  lazy: Lazy<Fx<R, E, A>>,
  __trace?: string,
) => Fx<R, E, A>

export const map =
  <A, B>(f: (a: A) => B, __trace?: string) =>
  <R, E>(io: Fx<R, E, A>): Fx<R, E, B> =>
    IO_.MapIO.make(io, f, __trace) as Fx<R, E, B>

export const wait = <R, E, A>(future: Future<R, E, A>, __trace?: string): Fx<R, E, A> =>
  IO_.WaitIO.make(future, __trace) as Fx<R, E, A>

export const flatMap =
  <A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>, __trace?: string | undefined) =>
  <R, E>(io: Fx<R, E, A>): Fx<R | R2, E | E2, B> =>
    IO_.FlatMapIO.make(io, f, __trace) as Fx<R | R2, E | E2, B>

export const tapFx =
  <A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>, __trace?: string | undefined) =>
  <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> =>
    pipe(
      fx,
      flatMap(
        (a) =>
          pipe(
            a,
            f,
            map(() => a),
          ),
        __trace,
      ),
    )

export const orElse =
  <E, R2, E2, B>(f: (cause: Cause<E>) => Fx<R2, E2, B>, __trace?: string | undefined) =>
  <R, A>(io: Fx<R, E, A>): Fx<R | R2, E2, A | B> =>
    IO_.OrElseIO.make(io, f, __trace) as Fx<R | R2, E2, A | B>

export const attempt =
  <E, A, R2, E2, B>(f: (exit: Exit<E, A>) => Fx<R2, E2, B>, __trace?: string | undefined) =>
  <R>(io: Fx<R, E, A>): Fx<R | R2, E2, B> =>
    IO_.AttemptIO.make(io, f, __trace) as Fx<R | R2, E2, B>

export const ensuring =
  <E, A, R2, E2, B>(f: (exit: Exit<E, A>) => Fx<R2, E2, B>, __trace?: string) =>
  <R>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> =>
    pipe(
      fx,
      attempt(
        (exit) =>
          pipe(
            exit,
            f,
            attempt((exit2) => fromExit(concatExitSeq(exit, exit2))),
          ),
        __trace,
      ),
    )

export const getIORefs = fromIO(IO_.GetIORefs.make())
