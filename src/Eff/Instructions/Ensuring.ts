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
