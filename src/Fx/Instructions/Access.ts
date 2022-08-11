import type { Fx } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

import type { Env } from '@/Env/Env.js'

export class Access<R, R2, E, A> extends FxInstruction<
  (resources: Env<R>) => Fx<R2, E, A>,
  R | R2,
  E,
  A
> {
  static tag = 'Access' as const
  readonly tag = Access.tag
}

export class Provide<R, E, A> extends FxInstruction<
  readonly [fx: Fx<R, E, A>, env: Env<R>],
  never,
  E,
  A
> {
  static tag = 'Provide' as const
  readonly tag = Provide.tag
}
