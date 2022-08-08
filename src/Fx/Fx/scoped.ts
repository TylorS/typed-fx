import { pipe } from 'hkt-ts/function'

import {
  Fx,
  ask,
  ensuring,
  getEnv,
  getFiberScope,
  provide,
  provideService,
  uninterruptable,
} from './Fx.js'

import { Scope } from '@/Fx/Scope/Scope.js'

/**
 * Run a Scoped Fx within an isolated Scope, cleaning up those resources as soon as complete.
 */
export function scoped<R, E, A>(scoped: Fx<R | Scope, E, A>): Fx<Exclude<R, Scope>, E, A> {
  return Fx(function* () {
    const fiberScope = yield* getFiberScope
    const scope = fiberScope.fork()

    return yield* pipe(scoped, provideService(Scope, scope), ensuring(scope.close))
  })
}

/**
 * Track a Resource within a given Scoped environment
 */
export function managed<R, E, A, R2>(
  acquire: Fx<R, E, A>,
  release: (value: A) => Fx<R2, never, any>,
): Fx<R | R2 | Scope, E, A> {
  return uninterruptable(
    Fx(function* () {
      const scope = yield* ask(Scope)
      const env = yield* getEnv<R | R2>()

      const a = yield* acquire

      scope.ensuring(() => pipe(a, release, provide(env)))

      return a
    }),
  )
}

/**
 * Perform an effect with an aquired resource with the release of that resource.
 */
export function bracket<R, E, A, R2, E2, B, R3>(
  acquire: Fx<R, E, A>,
  withResource: (a: A) => Fx<R2, E2, B>,
  release: (a: A) => Fx<R3, never, unknown>,
): Fx<Scope | R | R2 | R3, E | E2, B> {
  return Fx(function* () {
    const a: A = yield* managed(acquire, release)

    return yield* withResource(a)
  })
}

/**
 * Run a Scoped Fx within an isolated Scope, cleaning up those resources as soon as complete.
 */
export function fiberScoped<R, E, A>(scoped: Fx<R | Scope, E, A>): Fx<Exclude<R, Scope>, E, A> {
  return Fx(function* () {
    const fiberScope = yield* getFiberScope

    return yield* pipe(scoped, provideService(Scope, fiberScope))
  })
}
