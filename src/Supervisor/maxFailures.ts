import { pipe } from 'hkt-ts'
import { isRight } from 'hkt-ts/Either'
import * as Maybe from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Supervisor } from './Supervisor.js'

import { Atomic, update } from '@/Atomic/Atomic.js'
import * as Exit from '@/Exit/Exit.js'
import { AnyLiveFiber } from '@/Fiber/Fiber.js'
import { FiberId } from '@/FiberId/index.js'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime.js'
import { AnyFx, fromLazy } from '@/Fx/index.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'

const concatExitSeq = Exit.makeSequentialAssociative<any, any>(First).concat

export interface FiberFailureState {
  readonly fx: AnyFx
  readonly fiber: AnyLiveFiber
  readonly exit: Maybe.Maybe<Exit.AnyExit>
  readonly failures: NonNegativeInteger
}

export interface FiberFailuresState extends ImmutableMap<FiberId.Live, FiberFailureState> {}

export function maxFailures(maxFailures: NonNegativeInteger): Supervisor<FiberFailuresState> {
  const state = Atomic<FiberFailuresState>(ImmutableMap())

  return new Supervisor(
    fromLazy(state.get),
    (fiber, fx) => {
      pipe(
        state,
        update((fibers) => {
          return fibers.has(fiber.id)
            ? fibers
            : fibers.set(fiber.id, {
                fx,
                fiber,
                exit: Maybe.Nothing,
                failures: NonNegativeInteger(0),
              })
        }),
      )
    },
    (fiber, exit) => {
      pipe(
        state,
        update((fibers) =>
          pipe(
            fibers.get(fiber.id),
            Maybe.match(
              () => fibers,
              (s) => {
                const nextIteration = NonNegativeInteger(s.failures + 1)

                // If we succeeded, remove the fiber from state.
                if (isRight(exit) || nextIteration > maxFailures) {
                  return fibers.remove(fiber.id)
                }

                // Retry this Fx
                const nextFiber = new FiberRuntime(s.fx, s.fiber.context.fork())

                nextFiber.startAsync()

                return fibers.set(fiber.id, {
                  ...s,
                  exit: pipe(
                    s.exit,
                    Maybe.map((e) => concatExitSeq(e, exit)),
                    Maybe.orElse(() => Maybe.Just(exit)),
                  ),
                  fiber: nextFiber,
                  failures: nextIteration,
                })
              },
            ),
          ),
        ),
      )
    },
  )
}
