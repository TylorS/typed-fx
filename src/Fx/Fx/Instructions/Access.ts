import type { Fx } from '../Fx.js'

import { Eff } from '@/Eff/Eff.js'
import { Env } from '@/Fx/Env/Env.js'

export class Access<R, R2, E, A> extends Eff.Instruction<(resources: Env<R>) => Fx<R2, E, A>, A> {
  readonly tag = 'Access'

  readonly __R?: () => R | R2
  readonly __E?: () => E
  readonly __A?: () => A
}

export class Provide<R, E, A> extends Eff.Instruction<readonly [fx: Fx<R, E, A>, env: Env<R>], A> {
  readonly tag = 'Provide'

  readonly __R?: () => never
  readonly __E?: () => E
  readonly __A?: () => A
}
