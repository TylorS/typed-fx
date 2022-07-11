import { Fx, IO } from '../Fx'

import { FxInstruction } from './FxInstruction'

import type { Environment } from '@/Environment/Environment'
import type { Service } from '@/Service/Service'

export class Provide<R extends Service<any>, E, A> extends FxInstruction<
  readonly [fx: Fx<R, E, A>, environment: Environment<R>],
  never,
  E,
  A
> {}

export const provide =
  <R extends Service<any>>(environment: Environment<R>) =>
  <E, A>(fx: Fx<R, E, A>): IO<E, A> =>
    new Provide([fx, environment])
