import { Either, isLeft, isRight } from 'hkt-ts/Either'

import { Fx } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'
import * as Failure from '@/Fx/Eff/Failure.js'
import { addCustomTrace } from '@/Fx/Eff/Trace.js'
import * as Exit from '@/Fx/Exit/Exit.js'
import * as Fiber from '@/Fx/Fiber/Fiber.js'
import type { FiberContext } from '@/Fx/FiberContext/FiberContext.js'
import { Scope } from '@/Fx/Scope/Scope.js'

export class Fork<R, E, A> extends Eff.Instruction<
  readonly [Fx<R, E, A>, ForkParams?],
  Fiber.Live<E, A>
> {
  readonly tag = 'Fork'
}

export interface ForkParams extends Partial<FiberContext> {
  readonly forkScope?: Scope
}

export const fork = <R, E, A>(
  fx: Fx<R, E, A>,
  params?: ForkParams,
  __trace?: string,
): Fx<R, never, Fiber.Live<E, A>> => new Fork([fx, params], __trace)

export const fromExit = <E, A>(exit: Exit.Exit<E, A>, __trace?: string): Fx<never, E, A> =>
  Fx(function* () {
    if (isLeft(exit)) {
      return yield* Failure.failure(exit.left)
    }

    return exit.right
  }, __trace)

export const fromEither = <E, A>(either: Either<E, A>) => fromExit(Exit.fromEither(either))

export const join = <E, A>(fiber: Fiber.Fiber<E, A>, __trace?: string): Fx<never, E, A> =>
  Fx(function* () {
    yield* addCustomTrace(__trace)

    const exit = yield* fiber.exit

    if (isRight(exit)) {
      yield* Fiber.inheritRefs(fiber)
    }

    return yield* fromExit(exit)
  })
