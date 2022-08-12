import type { FiberState } from './FiberState.js'
import type { RuntimeInstruction } from './RuntimeInstruction.js'

import type { AnyExit } from '@/Exit/Exit.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import type { AnyFuture } from '@/Future/Future.js'

/**
 * A RuntimeProcessor steps over the current Instruction and the current FiberState
 * and determines what to do next by producing a RuntimeDecision, and the updated FiberState.
 */
export interface RuntimeProcessor {
  (instruction: RuntimeInstruction, state: FiberState): RuntimeUpdate
}

export type RuntimeUpdate = readonly [RuntimeDecision, FiberState]

export type RuntimeDecision = Suspend | Await | Running | Done

export class Suspend {
  readonly tag = 'Suspend'
}

export class Running {
  readonly tag = 'Running'

  constructor(readonly instruction: RuntimeInstruction) {}
}

export class Done {
  readonly tag = 'Done'

  constructor(readonly exit: AnyExit) {}
}

export class Await {
  readonly tag = 'Await'

  constructor(
    readonly future: AnyFuture,
    readonly finalizer: Finalizer,
    readonly previous: RuntimeInstruction,
  ) {}
}
