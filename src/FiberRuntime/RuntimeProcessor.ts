import type { FiberState } from './FiberState.js'
import type { RuntimeInstruction } from './RuntimeInstruction.js'

import { Exit } from '@/Exit/Exit.js'

/**
 * A RuntimeProcessor steps over the current Instruction and the current FiberState
 * and determines what to do next by producing a RuntimeDecision, and the updated FiberState.
 */
export interface RuntimeProcessor {
  (instruction: RuntimeInstruction<any, any, any>, state: FiberState): readonly [
    RuntimeDecision<any, any, any>,
    FiberState,
  ]
}

export type RuntimeDecision<R, E, A> = Suspend | Running<R, E, A> | Done<E, A>

export class Suspend {
  readonly tag = 'Suspend'
}

export class Running<R, E, A> {
  readonly tag = 'Running'

  constructor(readonly instruction: RuntimeInstruction<R, E, A>) {}
}

export class Done<E, A> {
  readonly tag = 'Done'

  constructor(readonly exit: Exit<E, A>) {}
}
