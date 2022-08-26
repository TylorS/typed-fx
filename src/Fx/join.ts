import { Either } from 'hkt-ts'

import { Fx, fromExit } from './Fx.js'

// eslint-disable-next-line import/no-cycle
import * as Fiber from '@/Fiber/Fiber.js'

export const join = <E, A>(fiber: Fiber.Fiber<E, A>) =>
  Fx(function* () {
    const exit = yield* fiber.exit

    if (Either.isRight(exit)) {
      yield* Fiber.inheritFiberRefs(fiber)
    }

    return yield* fromExit(exit)
  })
