import { pipe } from 'hkt-ts'
import * as Either from 'hkt-ts/Either'
import { Associative } from 'hkt-ts/Typeclass'
import { Eq } from 'hkt-ts/Typeclass/Eq'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import * as Cause from '@/Fx/Cause/Cause.js'
import * as FiberId from '@/Fx/FiberId/FiberId.js'

export type Exit<E, A> = Either.Either<Cause.Cause<E>, A>

export const success = <A>(value: A): Exit<never, A> => Either.Right(value)

export const interrupt = (fiberId: FiberId.FiberId): Exit<never, never> =>
  Either.Left(Cause.interrupted(fiberId))

export const die = (error: unknown): Exit<never, never> => Either.Left(Cause.died(error))

export const failure = <E>(error: E): Exit<E, never> => Either.Left(Cause.failed(error))

export const fromEither = <E, A>(either: Either.Either<E, A>): Exit<E, A> =>
  pipe(
    either,
    Either.mapLeft((e) => Cause.failed(e)),
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

export const makeParallelBottom = <E>() => Either.makeBottom(Cause.makeParallelIdentity<E>())
export const makeSequentialBottom = <E>() => Either.makeBottom(Cause.makeSequentialIdentity<E>())

export const makeEq = <E, A>(E: Eq<E>, A: Eq<A>): Eq<Exit<E, A>> =>
  Either.makeEq(Cause.makeEq(E), A)
