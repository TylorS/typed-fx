import { Lazy } from 'hkt-ts/function'

import { FxInstruction } from './FxInstruction.js'

/**
 * Peform Synchronous effects with ability to yield cooperatively to other Fibers.
 */
export class FromLazy<A> extends FxInstruction<Lazy<A>, never, never, A> {
  static tag = 'FromLazy' as const
  readonly tag = FromLazy.tag
}
