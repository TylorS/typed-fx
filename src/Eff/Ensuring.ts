import { Eff } from './Eff.js'

import { Exit } from '@/Exit/Exit.js'

export interface Finalizer<Y> {
  <E, A>(exit: Exit<E, A>): Eff<Y, any>
}

export class Ensuring<Y> extends Eff.Instruction<Finalizer<Y>, Finalizer<Y>> {
  readonly tag = 'Ensuring'
}

export const ensuring = <Y>(
  finalizer: Finalizer<Y>,
  __trace?: string,
): Eff<Ensuring<Y>, Finalizer<Y>> => new Ensuring(finalizer, __trace)
