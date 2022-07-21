import { Fx } from './Fx'
import { fork } from './InstructionSet/Fork'
import { join } from './join'

import { Fiber } from '@/Fiber/Fiber'
import { Supervisor } from '@/Supervisor/Supervisor'

export const withSupervisor =
  <B>(supervisor: Supervisor<B>) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, never, Fiber.Live<E, A>> =>
    fork(fx, { supervisor })

export const supervised =
  <B>(supervisor: Supervisor<B>) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, readonly [A, B]> =>
    Fx(function* () {
      const fiber = yield* withSupervisor(supervisor)(fx)
      const a = yield* join(fiber)

      return [a, supervisor.atomic.get] as const
    })
