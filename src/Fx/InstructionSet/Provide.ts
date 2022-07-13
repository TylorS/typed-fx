import { Fx, IO } from '../Fx'

import { FxInstruction } from './FxInstruction'

import type { Env } from '@/Env/Env'

export class Provide<R, E, A> extends FxInstruction<
  readonly [fx: Fx<R, E, A>, env: Env<R>],
  never,
  E,
  A
> {}

export const provide =
  <R>(env: Env<R>) =>
  <E, A>(fx: Fx<R, E, A>): IO<E, A> =>
    new Provide([fx, env])
