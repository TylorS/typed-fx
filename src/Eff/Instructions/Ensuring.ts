import { Eff } from '../Eff.js'

import { Exit } from '@/Exit/Exit.js'

export interface Finalizer<Y> {
  (exit: Exit<any, any>): Eff<Y, any>
}

export class Ensuring<Y, R, Y2> extends Eff.Instruction<
  readonly [eff: Eff<Y, R>, finalizer: Finalizer<Y2>],
  R
> {
  readonly tag = 'Ensuring'
}

export function ensuring<Y2>(finalizer: Finalizer<Y2>, __trace?: string) {
  return <Y, R>(eff: Eff<Y, R>): Eff<Ensuring<Y, R, Y2>, R> =>
    new Ensuring([eff, finalizer], __trace)
}
