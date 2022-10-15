import { Maybe } from 'hkt-ts'
import * as Either from 'hkt-ts/Either'
import { First } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'

import { Effect } from './Effect.js'
import * as Op from './Op.js'

import * as Cause from '@/Cause/Cause.js'
import type { Disposable } from '@/Disposable/Disposable.js'
import type { Env } from '@/Env/Env.js'
import { Exit, makeSequentialAssociative } from '@/Exit/Exit.js'
import type { Service } from '@/Service/Service.js'

const concatExitSeq = makeSequentialAssociative<any, any>(First).concat

export function askEnv<R>(): Effect<R, never, Env<R>> {
  return new Op.AskEnv()
}

export function provide<R>(env: Env<R>) {
  return <E, A>(effect: Effect<R, E, A>): Effect<never, E, A> => new Op.Provide(effect, env)
}

export function fail<E>(cause: Cause.Cause<E>): Effect<never, E, never> {
  return new Op.Fail(cause) as Effect<never, E, never>
}

export function now<A>(value: A): Effect<never, never, A> {
  return new Op.Now(value)
}

export function fromLazy<A>(f: () => A): Effect<never, never, A> {
  return new Op.FromLazy(f)
}

export function lazy<R, E, A>(f: () => Effect<R, E, A>): Effect<R, E, A> {
  return new Op.Lazy(f)
}

export function async<R, E, A>(
  f: (cb: (effect: Effect<R, E, A>) => void) => Either.Either<Disposable, Effect<R, E, A>>,
): Effect<R, E, A> {
  return new Op.Async(f)
}

export function map<A, B>(f: (a: A) => B) {
  return <R, E>(effect: Effect<R, E, A>): Effect<R, E, B> => {
    return Op.MapFrame.make(effect, f)
  }
}

export function mapLeft<E, F>(f: (e: E) => F) {
  return <R, A>(effect: Effect<R, E, A>): Effect<R, F, A> => {
    return new Op.MapLeftFrame(effect, Cause.map(f))
  }
}

export function mapLeftCause<E, F>(f: (e: Cause.Cause<E>) => Cause.Cause<F>) {
  return <R, A>(effect: Effect<R, E, A>): Effect<R, F, A> => {
    return new Op.MapLeftFrame(effect, f)
  }
}

export function bimap<E, F, A, B>(f: (e: E) => F, g: (a: A) => B) {
  return <R>(effect: Effect<R, E, A>): Effect<R, F, B> => {
    return new Op.BimapFrame(effect, Cause.map(f), g)
  }
}

export function bimapCause<E, F, A, B>(f: (e: Cause.Cause<E>) => Cause.Cause<F>, g: (a: A) => B) {
  return <R>(effect: Effect<R, E, A>): Effect<R, F, B> => {
    return new Op.BimapFrame(effect, f, g)
  }
}

export function flatMap<A, R2, E2, B>(f: (a: A) => Effect<R2, E2, B>) {
  return <R, E>(effect: Effect<R, E, A>): Effect<R | R2, E | E2, B> => {
    return new Op.FlatMapFrame(effect, f)
  }
}

export function orElse<E, R2, E2, B>(f: (cause: E) => Effect<R2, E2, B>) {
  return <R, A>(effect: Effect<R, E, A>): Effect<R | R2, E2, A | B> =>
    new Op.OrElseFrame(effect, (cause) =>
      pipe(
        cause,
        Cause.findExpected,
        Maybe.match(() => fail(cause), f),
      ),
    )
}

export function orElseCause<E, R2, E2, B>(f: (cause: Cause.Cause<E>) => Effect<R2, E2, B>) {
  return <R, A>(effect: Effect<R, E, A>): Effect<R | R2, E2, A | B> => new Op.OrElseFrame(effect, f)
}

export function onExit<E, A, R2, E2, B>(f: (exit: Exit<E, A>) => Effect<R2, E2, B>) {
  return <R>(effect: Effect<R, E, A>): Effect<R | R2, E2, B> => new Op.ExitFrame(effect, f)
}

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
              Maybe.match(() => fail(cause), onLeft),
            ),
          onRight,
        ),
      ),
    )
}

export function matchCause<E, R2, E2, B, A, R3, E3, C>(
  onLeft: (e: Cause.Cause<E>) => Effect<R2, E2, B>,
  onRight: (a: A) => Effect<R3, E3, C>,
) {
  return <R>(effect: Effect<R, E, A>) =>
    pipe(effect, onExit<E, A, R2 | R3, E2 | E3, B | C>(Either.match(onLeft, onRight)))
}

export function interruptable<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
  return new Op.InterruptFrame(effect, true)
}

export function uninterruptable<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
  return new Op.InterruptFrame(effect, false)
}

export function attempt<R, E, A>(effect: Effect<R, E, A>): Effect<R, never, Exit<E, A>> {
  return pipe(effect, onExit(now))
}

export function fromExit<E, A>(exit: Exit<E, A>): Effect<never, E, A> {
  return Either.isLeft(exit) ? fail(exit.left) : now(exit.right)
}

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

export function ask<S>(service: Service<S>): Effect<S, never, S> {
  return pipe(
    askEnv<S>(),
    map((env) => env.get(service)),
  )
}

export function service<S>(service: Service<S>) {
  return <R2, E2, B>(f: (s: S) => Effect<R2, E2, B>): Effect<R2 | S, E2, B> =>
    flatMap((env: Env<S>) => f(env.get(service)))(askEnv<S>())
}

export { service as with }

export function provideService<S>(service: Service<S>, impl: S) {
  return <R, E, A>(effect: Effect<R | S, E, A>): Effect<Exclude<R, S>, E, A> =>
    pipe(
      askEnv<R>(),
      flatMap((env) => pipe(effect, provide(env.add(service, impl)))),
    )
}

export function provideSome<S>(env: Env<S>) {
  return <R, E, A>(effect: Effect<R | S, E, A>): Effect<Exclude<R, S>, E, A> =>
    pipe(
      askEnv<R>(),
      flatMap((e) => pipe(effect, provide(e.join(env)))),
    )
}
