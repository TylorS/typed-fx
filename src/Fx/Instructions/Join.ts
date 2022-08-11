import { FxInstruction } from './FxInstruction.js'

import { Fiber } from '@/Fiber/Fiber.js'

export class Join<E, A> extends FxInstruction<Fiber<E, A>, never, E, A> {
  static tag = 'Join' as const
  readonly tag = Join.tag
}
