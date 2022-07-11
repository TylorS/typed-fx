import { Either, pipe } from 'hkt-ts'
import * as These from 'hkt-ts/These'
import { Associative } from 'hkt-ts/Typeclass'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import * as Cause from '@/Cause/Cause'
import { FiberId } from '@/FiberId/FiberId'
import { EmptyTrace, Trace } from '@/Trace/Trace'

export type Exit<E, A> = These.These<Cause.Cause<E>, A>

export const success = <A>(value: A): Exit<never, A> => These.Right(value)

export const interrupt = (fiberId: FiberId, trace: Trace = EmptyTrace): Exit<never, never> =>
  These.Left(new Cause.Interrupted(fiberId, trace))

export const die = (error: unknown, trace: Trace = EmptyTrace): Exit<never, never> =>
  These.Left(new Cause.Died(error, trace))

export const failure = <E>(error: E, trace: Trace = EmptyTrace): Exit<E, never> =>
  These.Left(new Cause.Failed(error, false, trace))

export const optionalFailure = <E, A>(error: E, value: A, trace: Trace = EmptyTrace): Exit<E, A> =>
  These.Both(new Cause.Failed(error, true, trace), value)

export const fromThese = <E, A>(these: These.These<E, A>): Exit<E, A> =>
  pipe(
    these,
    These.mapLeft((e) => new Cause.Failed(e, These.isBoth(these))),
  )

export const fromEither: <E, A>(either: Either.Either<E, A>) => Exit<E, A> = fromThese

export const makeParallelAssociative = <A, E = never>(
  A: Associative.Associative<A>,
): Associative.Associative<Exit<E, A>> =>
  These.makeAssociative(Cause.makeParallelAssociative<E>(), A)

export const makeSequentialAssociative = <A, E = never>(
  A: Associative.Associative<A>,
): Associative.Associative<Exit<E, A>> =>
  These.makeAssociative(Cause.makeSequentialAssociative<E>(), A)

export const makeParallelIdentity = <A, E = never>(A: Identity<A>): Identity<Exit<E, A>> =>
  These.makeIdentity(Cause.makeParallelAssociative<E>(), A)

export const makeSequentialIdentity = <A, E = never>(A: Identity<A>): Identity<Exit<E, A>> =>
  These.makeIdentity(Cause.makeSequentialAssociative<E>(), A)
