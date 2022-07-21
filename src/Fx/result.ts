import { isRight } from 'hkt-ts/Either'

import { Fx } from './Fx'
import { fork } from './InstructionSet/Fork'

import { LiveFiber } from '@/Fiber/Fiber'

export const result = <R, E, A>(fx: Fx<R, E, A>) =>
  Fx(function* () {
    const fiber: LiveFiber<E, A> = yield* fork(fx)
    const exit = yield* fiber.exit

    if (isRight(exit)) {
      yield* fiber.inheritFiberRefs
    }

    return exit
  })
