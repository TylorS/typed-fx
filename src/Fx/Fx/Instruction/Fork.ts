import { isLeft, isRight } from 'hkt-ts/Either'

import { Fx } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'
import { failure } from '@/Fx/Eff/Failure.js'
import { Exit } from '@/Fx/Exit/Exit.js'
import { Fiber } from '@/Fx/Fiber/Fiber.js'

export class Fork<R, E, A> extends Eff.Instruction<Fx<R, E, A>, Fiber.Live<E, A>> {}

export const fork = <R, E, A>(fx: Fx<R, E, A>, __trace?: string): Fx<R, never, Fiber.Live<E, A>> =>
  new Fork(fx, __trace)

export const fromExit = <E, A>(exit: Exit<E, A>) =>
  Fx(function* () {
    if (isLeft(exit)) {
      return yield* failure(exit.left)
    }

    return exit.right
  })

export const join = <E, A>(fiber: Fiber<E, A>) =>
  Fx(function* () {
    const exit = yield* fiber.exit

    if (isRight(exit)) {
      yield* fiber.inheritRefs
    }

    return yield* fromExit(exit)
  })
