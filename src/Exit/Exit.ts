import { pipe } from 'hkt-ts'
import * as Either from 'hkt-ts/Either'
import { Associative } from 'hkt-ts/Typeclass'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import * as Cause from '@/Cause/Cause'
import { FiberId } from '@/FiberId/FiberId'

export type Exit<E, A> = Either.Either<Cause.Cause<E>, A>

export const success = <A>(value: A): Exit<never, A> => Either.Right(value)

export const interrupt = (fiberId: FiberId): Exit<never, never> =>
  Either.Left(new Cause.Interrupted(fiberId))

export const die = (error: unknown): Exit<never, never> => Either.Left(new Cause.Died(error))

export const failure = <E>(error: E): Exit<E, never> => Either.Left(new Cause.Failed(error))

export const fromEither = <E, A>(either: Either.Either<E, A>): Exit<E, A> =>
  pipe(
    either,
    Either.mapLeft((e) => new Cause.Failed(e)),
  )

export const makeParallelAssociative = <A, E = never>(
  A: Associative.Associative<A>,
): Associative.Associative<Exit<E, A>> =>
  Either.makeAssociative(Cause.makeParallelAssociative<E>(), A)

export const makeSequentialAssociative = <A, E = never>(
  A: Associative.Associative<A>,
): Associative.Associative<Exit<E, A>> =>
  Either.makeAssociative(Cause.makeSequentialAssociative<E>(), A)

export const makeParallelIdentity = <A, E = never>(A: Identity<A>): Identity<Exit<E, A>> =>
  Either.makeIdentity(Cause.makeParallelAssociative<E>(), A)

export const makeSequentialIdentity = <A, E = never>(A: Identity<A>): Identity<Exit<E, A>> =>
  Either.makeIdentity(Cause.makeSequentialAssociative<E>(), A)
