import { FxInstruction } from './FxInstruction.js'

import { Fiber } from '@/Fx/Fiber/Fiber.js'

export class Join<E, A> extends FxInstruction<Fiber<E, A>, never, E, A> {
  readonly tag = 'Join'
}
