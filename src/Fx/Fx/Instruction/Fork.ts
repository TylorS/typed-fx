import { Either, isLeft, isRight } from 'hkt-ts/Either'

import { Fx } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'
import * as Failure from '@/Fx/Eff/Failure.js'
import { addCustomTrace } from '@/Fx/Eff/Trace.js'
import * as Exit from '@/Fx/Exit/Exit.js'
import type * as Fiber from '@/Fx/Fiber/Fiber.js'

export class Fork<R, E, A> extends Eff.Instruction<Fx<R, E, A>, Fiber.Live<E, A>> {}

export const fork = <R, E, A>(fx: Fx<R, E, A>, __trace?: string): Fx<R, never, Fiber.Live<E, A>> =>
  new Fork(fx, __trace)

export const fromExit = <E, A>(exit: Exit.Exit<E, A>, __trace?: string): Fx<never, E, A> =>
  Fx(function* () {
    yield* addCustomTrace(__trace)

    if (isLeft(exit)) {
      return yield* Failure.failure(exit.left)
    }

    return exit.right
  })

export const fromEither = <E, A>(either: Either<E, A>) => fromExit(Exit.fromEither(either))

export const join = <E, A>(fiber: Fiber.Fiber<E, A>, __trace?: string): Fx<never, E, A> =>
  Fx(function* () {
    yield* addCustomTrace(__trace)

    const exit = yield* fiber.exit

    if (isRight(exit)) {
      yield* fiber.inheritRefs
    }

    return yield* fromExit(exit)
  })
