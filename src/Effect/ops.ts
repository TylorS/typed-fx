import { Maybe } from 'hkt-ts'
import * as Either from 'hkt-ts/Either'
import { First } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'

import type { Effect } from './Effect.js'
import * as Op from './Op.js'

import * as Cause from '@/Cause/Cause.js'
import type { Disposable } from '@/Disposable/Disposable.js'
import type { Env } from '@/Env/Env.js'
import { Exit, makeSequentialAssociative } from '@/Exit/Exit.js'
import type { Service } from '@/Service/Service.js'

const concatExitSeq = makeSequentialAssociative<any, any>(First).concat

/**
 * Retrieve the current Env
 */
export function askEnv<R>(): Effect<R, never, Env<R>> {
  return new Op.AskEnv() as any
}

/**
 * Provide an Env to an Effect
 */
export function provide<R>(env: Env<R>) {
  return <E, A>(effect: Effect<R, E, A>): Effect<never, E, A> => new Op.Provide(effect, env) as any
}

/**
 * Fail with a specific Cause
 */
export function fromCause<E>(cause: Cause.Cause<E>): Effect<never, E, never> {
  return new Op.Fail(cause) as any
}

/**
 * Synchronously succeed with a value
 */
export function now<A>(value: A): Effect<never, never, A> {
  return new Op.Now(value) as any
}

/**
 * Lazily succeed with a value
 */
export function fromLazy<A>(f: () => A): Effect<never, never, A> {
  return new Op.FromLazy(f) as any
}

/**
 * Lazily compute an Effect
 */
export function lazy<R, E, A>(f: () => Effect<R, E, A>): Effect<R, E, A> {
  return new Op.Lazy(f)
}

/**
 * Perform an asynchronous operation
 */
export function async<R, E, A>(
  f: (cb: (effect: Effect<R, E, A>) => void) => Either.Either<Disposable, Effect<R, E, A>>,
): Effect<R, E, A> {
  return new Op.Async(f)
}

/**
 * Transform the success value of an Effect.
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(effect: Effect<R, E, A>): Effect<R, E, B> => {
    return Op.MapFrame.make(effect, f)
  }
}

/**
 * Transform the expected failure of an Effect.
 */
export function mapLeft<E, F>(f: (e: E) => F) {
  return <R, A>(effect: Effect<R, E, A>): Effect<R, F, A> => {
    return Op.MapLeftFrame.make(effect, Cause.map(f))
  }
}

/**
 * Transform the Cause of an Effect.
 */
export function mapLeftCause<E, F>(f: (e: Cause.Cause<E>) => Cause.Cause<F>) {
  return <R, A>(effect: Effect<R, E, A>): Effect<R, F, A> => {
    return Op.MapLeftFrame.make(effect, f)
  }
}

/**
 * Transform the expected failure and the success value of an Effect
 */
export function bimap<E, F, A, B>(f: (e: E) => F, g: (a: A) => B) {
  return <R>(effect: Effect<R, E, A>): Effect<R, F, B> => {
    return new Op.BimapFrame(effect, Cause.map(f), g)
  }
}

/**
 * Transform the cause and the success value of an Effect
 */
export function bimapCause<E, F, A, B>(f: (e: Cause.Cause<E>) => Cause.Cause<F>, g: (a: A) => B) {
  return <R>(effect: Effect<R, E, A>): Effect<R, F, B> => {
    return new Op.BimapFrame(effect, f, g)
  }
}

/**
 * Perform an Effect with the success value of another
 */
export function flatMap<A, R2, E2, B>(f: (a: A) => Effect<R2, E2, B>) {
  return <R, E>(effect: Effect<R, E, A>): Effect<R | R2, E | E2, B> => {
    return new Op.FlatMapFrame(effect, f)
  }
}

/**
 * Perform an Effect with the expected failure of another Effect
 */
export function orElse<E, R2, E2, B>(f: (cause: E) => Effect<R2, E2, B>) {
  return <R, A>(effect: Effect<R, E, A>): Effect<R | R2, E2, A | B> =>
    Op.OrElseFrame.make(effect, (cause) =>
      pipe(
        cause,
        Cause.findExpected,
        Maybe.match(() => fromCause(cause), f),
      ),
    )
}

/**
 * Perform an Effect with the Cause of another Effect
 */
export function orElseCause<E, R2, E2, B>(f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>) {
  return <R, A>(effect: Effect<R, E, A>): Effect<R | R2, E2, A | B> =>
    Op.OrElseFrame.make(effect, f)
}

/**
 * Perform an Effect with the Exit value of another Effect.
 */
export function onExit<E, A, R2, E2, B>(f: (exit: Exit<E, A>) => Effect<R2, E2, B>) {
  return <R>(effect: Effect<R, E, A>): Effect<R | R2, E2, B> => new Op.ExitFrame(effect, f)
}

/**
 * Perform an Effect on either the expected failure or the success value of an Effect.
 */
export function match<E, R2, E2, B, A, R3, E3, C>(
  onLeft: (e: E) => Effect<R2, E2, B>,
  onRight: (a: A) => Effect<R3, E3, C>,
) {
  return <R>(effect: Effect<R, E, A>) =>
    pipe(
      effect,
      onExit<E, A, R2 | R3, E2 | E3, B | C>(
        Either.match(
          (cause) =>
            pipe(
              cause,
              Cause.findExpected,
              Maybe.match(() => fromCause(cause as Cause.Cause<never>), onLeft),
            ),
          onRight,
        ),
      ),
    )
}

/**
 * Perform an Effect on either the Cause or the success value of an Effect.
 */
export function matchCause<E, R2, E2, B, A, R3, E3, C>(
  onLeft: (e: Cause.Cause<E>) => Effect<R2, E2, B>,
  onRight: (a: A) => Effect<R3, E3, C>,
) {
  return <R>(effect: Effect<R, E, A>) =>
    pipe(effect, onExit<E, A, R2 | R3, E2 | E3, B | C>(Either.match(onLeft, onRight)))
}

/**
 * Mark an Effect as interruptable
 */
export function interruptable<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
  return new Op.InterruptFrame(effect, true)
}

/**
 * Mark an Effect as uninterruptable
 */
export function uninterruptable<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
  return new Op.InterruptFrame(effect, false)
}

/**
 * Attempt an Effect, returning its Exit value
 */
export function attempt<R, E, A>(effect: Effect<R, E, A>): Effect<R, never, Exit<E, A>> {
  return pipe(effect, onExit(now))
}

/**
 * Convert an Exit into an Effect
 */
export function fromExit<E, A>(exit: Exit<E, A>): Effect<never, E, A> {
  return Either.isLeft(exit) ? fromCause(exit.left) : now(exit.right)
}

/**
 * Ensure an Effect always runs but does not affect the output.
 */
export function ensuring<E, A, R2, E2, B>(f: (exit: Exit<E, A>) => Effect<R2, E2, B>) {
  return <R>(effect: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    pipe(
      effect,
      onExit((exit) =>
        pipe(
          exit,
          f,
          onExit((exit2) => fromExit(concatExitSeq(exit, exit2))),
        ),
      ),
    )
}

/**
 * Ask for a Service from the environment
 */
export function ask<S>(service: Service<S>): Effect<S, never, S> {
  return pipe(
    askEnv<S>(),
    map((env) => env.get(service)),
  )
}

/**
 * Perform an Effect with a Service from the environment
 */
export function service<S>(service: Service<S>) {
  return <R2, E2, B>(f: (s: S) => Effect<R2, E2, B>): Effect<R2 | S, E2, B> =>
    flatMap((env: Env<S>) => f(env.get(service)))(askEnv<S>())
}

export { service as with }

/**
 * Provide a Service to the environment of an Effect.
 */
export function provideService<S>(service: Service<S>, impl: S) {
  return <R, E, A>(effect: Effect<R | S, E, A>): Effect<Exclude<R, S>, E, A> =>
    pipe(
      askEnv<Exclude<R, S>>(),
      flatMap((env) => pipe(effect, provide((env as Env<R>).add(service, impl)))),
    )
}

/**
 * Provide a partial environment to an Effect.
 */
export function provideSome<S>(env: Env<S>) {
  return <R, E, A>(effect: Effect<R | S, E, A>): Effect<Exclude<R, S>, E, A> =>
    pipe(
      askEnv<Exclude<R, S>>(),
      flatMap((e) => pipe(effect, provide((e as Env<R>).join(env)))),
    )
}

/**
 * Ensure a synchronous callback is always called after an Effect runs.
 */
export function pop(f: () => any) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> => new Op.PopFrame(effect, f)
}
