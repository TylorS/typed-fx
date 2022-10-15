import { Branded } from 'hkt-ts/Branded'

import { Exit } from '@/Exit/Exit.js'
import { Fx } from '@/Fx/Fx.js'

export interface Finalizer<R = never, E = never> {
  (exit: Exit<any, any>): Fx<R, E, any>
}

export type FinalizerKey = Branded<{ readonly FinalizerKey: FinalizerKey }, symbol>
export const FinalizerKey = Branded<FinalizerKey>()
