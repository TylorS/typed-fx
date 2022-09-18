import { pipe } from 'hkt-ts/function'

import * as Fx from './Fx.js'

import { ConcurrentStrategy, FinalizationStrategy } from '@/Finalizer/Finalizer.js'
import { Scope } from '@/Scope/Scope.js'

/**
 * Run a Scoped Fx within an isolated Scope, cleaning up those resources as soon as complete.
 */
export function scoped<R, E, A>(
  scoped: Fx.Fx<R | Scope, E, A>,
  strategy: FinalizationStrategy = ConcurrentStrategy,
): Fx.Fx<Exclude<R, Scope>, E, A> {
  return pipe(
    Fx.getFiberContext,
    Fx.flatMap(({ scope: fiberScope }) => {
      const scope = fiberScope.fork(strategy)

      return pipe(scoped, Fx.provideService(Scope, scope), Fx.ensuring(scope.close))
    }),
  )
}

/**
 * Track a Resource within a given Scoped environment
 */
export function managed<R, E, A, R2>(
  acquire: Fx.Fx<R, E, A>,
  release: (value: A) => Fx.Fx<R2, never, any>,
): Fx.Fx<R | R2 | Scope, E, A> {
  return pipe(
    Fx.ask(Scope),
    Fx.bindTo('scope'),
    Fx.bind('env', () => Fx.getEnv<R | R2>()),
    Fx.bind('a', () => acquire),
    Fx.tap(({ scope, env, a }) =>
      Fx.fromLazy(() => scope.ensuring(() => pipe(a, release, Fx.provide(env)))),
    ),
    Fx.map(({ a }) => a),
    Fx.uninterruptable,
  )
}

/**
 * Perform an effect with an aquired resource with the release of that resource.
 */
export function bracket<R, E, A, R2, E2, B, R3>(
  acquire: Fx.Fx<R, E, A>,
  withResource: (a: A) => Fx.Fx<R2, E2, B>,
  release: (a: A) => Fx.Fx<R3, never, unknown>,
): Fx.Fx<Scope | R | R2 | R3, E | E2, B> {
  return pipe(managed(acquire, release), Fx.flatMap(withResource))
}

/**
 * Run a Scoped Fx within an isolated Scope, cleaning up those resources as soon as complete.
 */
export function fiberScoped<R, E, A>(
  scoped: Fx.Fx<R | Scope, E, A>,
): Fx.Fx<Exclude<R, Scope>, E, A> {
  return pipe(
    Fx.getFiberContext,
    Fx.flatMap(({ scope }) => pipe(scoped, Fx.provideService(Scope, scope))),
  )
}
