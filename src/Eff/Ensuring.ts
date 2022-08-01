import { Eff } from './Eff.js'

import { Exit } from '@/Exit/Exit.js'
import { StrictExclude } from '@/internal.js'

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

export class Scoped<Y, Y2, R> extends Eff.Instruction<Eff<Y | Ensuring<Y2>, R>, R> {
  readonly tag = 'Scoped'
}

export const scoped = <Y, Y2, R>(
  eff: Eff<Y | Ensuring<Y2>, R>,
  __trace?: string,
): Eff<StrictExclude<Y | Y2, Ensuring<Y2>> | Scoped<Y, Y2, R>, R> => new Scoped(eff, __trace)
