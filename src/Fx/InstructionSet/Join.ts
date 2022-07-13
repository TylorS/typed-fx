import { Fx } from '../Fx'

import { FxInstruction } from './FxInstruction'

import type { Fiber } from '@/Fiber/Fiber'

export class Join<E, A> extends FxInstruction<Fiber<E, A>, never, E, A> {}

export const join = <E, A>(fx: Fiber<E, A>): Fx<never, E, A> => new Join(fx)
