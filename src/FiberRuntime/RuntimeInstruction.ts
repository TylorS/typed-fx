import { Endomorphism, identity } from 'hkt-ts'
import { Maybe, Nothing } from 'hkt-ts/Maybe'

import { FiberState } from './FiberState.js'
import { RuntimeProcessor, RuntimeUpdate } from './RuntimeProcessor.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { Cause } from '@/Cause/Cause.js'
import { AnyExit } from '@/Exit/Exit.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import { AnyFx } from '@/Fx/Fx.js'
import { AnyInstruction } from '@/Fx/Instructions/Instruction.js'
import { Trace } from '@/Trace/Trace.js'

export type RuntimeInstruction =
  | ExitNode
  | FailureNode
  | FinalizerNode
  | FxNode
  | GeneratorNode
  | InitialNode
  | InstructionNode
  | PopNode

export namespace RuntimeInstruction {
  export function match(
    initial: (instr: InitialNode, state: FiberState) => RuntimeUpdate,
    generator: (instr: GeneratorNode, state: FiberState) => RuntimeUpdate,
    instruction: (instr: InstructionNode, state: FiberState) => RuntimeUpdate,
    fx: (instr: FxNode, state: FiberState) => RuntimeUpdate,
    finalizer: (instr: FinalizerNode, state: FiberState) => RuntimeUpdate,
    pop: (instr: PopNode, state: FiberState) => RuntimeUpdate,
    exit: (instr: ExitNode, state: FiberState) => RuntimeUpdate,
    failure: (instr: FailureNode, state: FiberState) => RuntimeUpdate,
  ): RuntimeProcessor {
    return (instr: RuntimeInstruction, state: FiberState) => {
      switch (instr.tag) {
        case 'Initial':
          return initial(instr, state)
        case 'Generator':
          return generator(instr, state)
        case 'Instruction':
          return instruction(instr, state)
        case 'Fx':
          return fx(instr, state)
        case 'Finalizer':
          return finalizer(instr, state)
        case 'Pop':
          return pop(instr, state)
        case 'Exit':
          return exit(instr, state)
        case 'Failure':
          return failure(instr, state)
      }
    }
  }
}

/**
 * The start of ever Fiber
 */
export class InitialNode {
  readonly tag = 'Initial'

  constructor(readonly fx: AnyFx, readonly trace: Maybe<Trace>) {}
}

/**
 * The back-bone of the Runtime is built atop of generators for getting the next instruction and
 * for control flow back to other Fx.
 */
export class GeneratorNode {
  readonly tag = 'Generator'

  constructor(
    readonly generator: Generator<AnyInstruction, any>,
    readonly previous: RuntimeInstruction,
    readonly method: Atomic<'next' | 'throw'> = Atomic<'next' | 'throw'>('next'),
    readonly next: Atomic<any> = Atomic(undefined),
    readonly cause: Atomic<Maybe<Cause<any>>> = Atomic<Maybe<Cause<any>>>(Nothing),
  ) {}
}

/**
 * An Instruction Node is representing the current Instruction that needs processiong
 */
export class InstructionNode {
  readonly tag = 'Instruction'

  constructor(
    readonly instruction: AnyInstruction,
    readonly previous: GeneratorNode,
    readonly pop: Endomorphism.Endomorphism<FiberState> = identity,
  ) {}
}

/**
 * An Instruction can create new Fx which needs to be processed
 */
export class FxNode {
  readonly tag = 'Fx'

  constructor(readonly fx: AnyFx, readonly previous: InstructionNode) {}
}

/**
 * At any point in the Stack you can ensure that an Fx runs in both success and failure
 */
export class FinalizerNode {
  readonly tag = 'Finalizer'

  constructor(
    readonly fx: AnyFx,
    readonly finalizer: Finalizer | Finalizer<any, any>,
    readonly previous: InstructionNode,
    readonly exit: Atomic<Maybe<AnyExit>> = Atomic<Maybe<AnyExit>>(Nothing),
  ) {}
}

/**
 * At any point in the Stack update the state easily using processors, but this node
 * allows you to update the state while unwinding the stack.
 */
export class PopNode {
  readonly tag = 'Pop'

  constructor(
    readonly fx: AnyFx,
    readonly pop: Endomorphism.Endomorphism<FiberState>,
    readonly previous: InstructionNode,
    readonly exit: Atomic<Maybe<AnyExit>> = Atomic<Maybe<AnyExit>>(Nothing),
  ) {}
}

/**
 * Signals that the main process has completed and the Scope should be closed.
 */
export class ExitNode {
  readonly tag = 'Exit'

  constructor(readonly exit: AnyExit) {}
}

export class FailureNode {
  readonly tag = 'Failure'

  constructor(readonly error: Cause<any> | Cause<never>, readonly previous: RuntimeInstruction) {}
}
