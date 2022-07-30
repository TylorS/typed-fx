import type { Fx } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'
import type { Env } from '@/Fx/Env/Env.js'

export class Provide<R, E, A> extends Eff.Instruction<readonly [Fx<R, E, A>, Env<R>], A> {
  readonly tag = 'Provide'
}

export const provide =
  <R>(env: Env<R>, __trace?: string) =>
  <E, A>(fx: Fx<R, E, A>): Fx<never, E, A> =>
    new Provide([fx, env], __trace)
