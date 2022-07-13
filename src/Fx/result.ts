import { Fx } from './Fx'
import { fork } from './InstructionSet/Fork'

export const result = <R, E, A>(fx: Fx<R, E, A>) =>
  Fx(function* () {
    const fiber = yield* fork(fx)
    const exit = yield* fiber.exit

    yield* fiber.inheritFiberRefs

    return exit
  })
