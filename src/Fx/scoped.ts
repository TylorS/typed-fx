import { pipe } from 'hkt-ts'
import { Right } from 'hkt-ts/Either'

import { Fx, Of } from './Fx'
import { ask, getEnv, provideService } from './InstructionSet/Access'
import { getFiberContext } from './InstructionSet/GetFiberContext'
import { provide } from './InstructionSet/Provide'
import { uninterruptable } from './InstructionSet/SetInterruptable'
import { result } from './result'

import { Exit } from '@/Exit/Exit'
import { Scope } from '@/Scope/Scope'

export const getScope = ask(Scope)

/**
 * Run a Scoped-Fx and immediate release resources after usage of that resource
 * has been able to produce an Exit value.
 */
export function scoped<R, E, A>(scoped: Fx<R | Scope, E, A>): Fx<Exclude<R, Scope>, E, A> {
  return Fx(function* () {
    const { scope: fiberScope } = yield* getFiberContext
    const scope = yield* fiberScope.fork // Fork the scope, will be closed in event of failure.

    // Run effect with a specific Scope
    const a = yield* pipe(scoped, provideService(Scope, scope))

    // Close the Scope on success
    yield* scope.close(Right(a))

    return a
  })
}

/**
 * A Reservation is the representation of a resource that
 * has an aquisition and release phase.
 */
export interface Reservation<R, E, A> {
  readonly acquire: Fx<R, never, Exit<E, A>>
  readonly release: (exit: Exit<any, any>) => Of<void>
}

/**
 * Fx.reserve is a lower-level primitive for running Scoped-Fx with explicit acquisition and
 * release mechanism. When acquiring a resource
 */
export function reserve<R, E, A>(
  scoped: Fx<R | Scope, E, A>,
): Of<Reservation<Exclude<R, Scope>, E, A>> {
  return Fx(function* () {
    const { scope: fiberScope } = yield* getFiberContext
    const scope = yield* fiberScope.fork // Fork the scope, will be closed in event of failure.
    const reservation: Reservation<Exclude<R, Scope>, E, A> = {
      acquire: pipe(scoped, provideService(Scope, scope), result, uninterruptable),
      release: scope.close,
    }

    return reservation
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
    const scope = yield* getScope
    const env = yield* getEnv<R | R2>()

    const a = yield* uninterruptable(acquire)

    yield* scope.addFinalizer(() => pipe(a, release, provide(env)))

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
    const a = yield* managed(acquire, release)

    return yield* withResource(a)
  })
}
