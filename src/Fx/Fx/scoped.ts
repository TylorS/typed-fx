import { pipe } from 'hkt-ts/function'

import {
  Fx,
  Of,
  ask,
  attempt,
  fromExit,
  getEnv,
  getFiberScope,
  provide,
  provideService,
  uninterruptable,
} from './Fx.js'

import { Exit } from '@/Exit/Exit.js'
import { Scope } from '@/Fx/Scope/Scope.js'

/**
 * A Reservation is the representation of a resource that
 * has an aquisition and release phase.
 */
export interface Reservation<R, E, A> {
  readonly acquire: Fx<Exclude<R, Scope>, never, Exit<E, A>>
  readonly release: (exit: Exit<any, any>) => Of<boolean>
}

/**
 * Fx.reserve is a lower-level primitive for running Scoped-Fx with explicit acquisition and
 * release mechanism. When acquiring a resource
 */
export function reserve<R, E, A>(scoped: Fx<R | Scope, E, A>): Of<Reservation<R, E, A>> {
  return Fx(function* () {
    const fiberScope = yield* getFiberScope
    const scope = fiberScope.fork() // Fork the scope, will be closed in event of failure.
    const reservation: Reservation<R, E, A> = {
      acquire: pipe(scoped, provideService(Scope, scope), attempt, uninterruptable),
      release: scope.close,
    }

    return reservation
  })
}

export function scoped<R, E, A>(scoped: Fx<R | Scope, E, A>): Fx<Exclude<R, Scope>, E, A> {
  return Fx(function* () {
    const reservation: Reservation<R, E, A> = yield* reserve(scoped)
    const exit: Exit<E, A> = yield* reservation.acquire
    yield* reservation.release(exit)

    return yield* fromExit(exit)
  })
}

/**
 * Track a Resource within a given Scoped environment
 */
export function managed<R, E, A, R2>(
  acquire: Fx<R, E, A>,
  release: (value: A) => Fx<R2, never, any>,
): Fx<R | R2 | Scope, E, A> {
  return Fx(function* () {
    const scope = yield* ask(Scope)
    const env = yield* getEnv<R | R2>()

    const a = yield* uninterruptable(acquire)

    scope.ensuring(() => pipe(a, release, provide(env)))

    return a
  })
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
