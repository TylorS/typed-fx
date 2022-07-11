import { Fx } from '../Fx'

import { FxInstruction } from './FxInstruction'

import { Fiber } from '@/Fiber/Fiber'
import { Service } from '@/Service/Service'

export class Fork<R extends Service<any>, E, A> extends FxInstruction<
  Fx<R, E, A>,
  R,
  never,
  Fiber<E, A>
> {}

export const fork = <R extends Service<any>, E, A>(fx: Fx<R, E, A>): Fx<R, never, Fiber<E, A>> =>
  new Fork(fx)
