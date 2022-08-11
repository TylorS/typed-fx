import { Maybe } from 'hkt-ts/Maybe'

import { FiberState } from './FiberState.js'
import { RuntimeProcessor } from './RuntimeProcessor.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { Exit } from '@/Exit/Exit.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import { Fx } from '@/Fx/Fx.js'
import { Instruction } from '@/Fx/Instructions/Instruction.js'
import { Trace } from '@/Trace/Trace.js'

export type RuntimeInstruction<R, E, A> =
  | ExitNode<E, A>
  | FinalizerNode<any, any, any>
  | FxNode<any, any, any>
  | GeneratorNode<any, any, any>
  | InitialNode<R, E, A>
  | InstructionNode<any, any, any>

export namespace RuntimeInstruction {
  export function match(
    initial: <R, E, A>(
      instr: InitialNode<R, E, A>,
      state: FiberState,
    ) => ReturnType<RuntimeProcessor>,
    generator: <R, E, A>(
      instr: GeneratorNode<R, E, A>,
      state: FiberState,
    ) => ReturnType<RuntimeProcessor>,
    instruction: (
      instr: InstructionNode<any, any, any>,
      state: FiberState,
    ) => ReturnType<RuntimeProcessor>,
    fx: (instr: FxNode<any, any, any>, state: FiberState) => ReturnType<RuntimeProcessor>,
    finalizer: <R, E, A>(
      instr: FinalizerNode<R, E, A>,
      state: FiberState,
    ) => ReturnType<RuntimeProcessor>,
    exit: <E, A>(instr: ExitNode<E, A>, state: FiberState) => ReturnType<RuntimeProcessor>,
  ): RuntimeProcessor {
    return <R, E, A>(instr: RuntimeInstruction<R, E, A>, state: FiberState) => {
      switch (instr.tag) {
        case 'Initial':
          return initial<R, E, A>(instr, state)
        case 'Generator':
          return generator(instr, state)
        case 'Instruction':
          return instruction(instr, state)
        case 'Fx':
          return fx(instr, state)
        case 'Finalizer':
          return finalizer(instr, state)
        case 'Exit':
          return exit(instr, state)
      }
    }
  }
}

/**
 * The start of ever Fiber
 */
export class InitialNode<R, E, A> {
  readonly tag = 'Initial'

  constructor(readonly fx: Fx<R, E, A>, readonly trace: Maybe<Trace>) {}
}

/**
 * The back-bone of the Runtime is built atop of generators for getting the next instruction and
 * for control flow back to other Fx.
 */
export class GeneratorNode<R, E, A> {
  readonly tag = 'Generator'

  constructor(
    readonly generator: Generator<Instruction<R, E, any>, A>,
    readonly previous: Exclude<RuntimeInstruction<any, any, any>, GeneratorNode<any, any, any>>,
    readonly method: Atomic<'next' | 'throw'> = Atomic<'next' | 'throw'>('next'),
    readonly next: Atomic<any> = Atomic(undefined),
  ) {}
}

/**
 * An Instruction Node is representing the current Instruction that needs processiong
 */
export class InstructionNode<R, E, A> {
  readonly tag = 'Instruction'

  constructor(
    readonly instruction: Instruction<R, E, A>,
    readonly previous: GeneratorNode<any, any, any>,
  ) {}
}

/**
 * An Instruction can create new Fx which need to be processed
 */
export class FxNode<R, E, A> {
  readonly tag = 'Fx'

  constructor(readonly fx: Fx<R, E, A>, readonly previous: InstructionNode<R, E, any>) {}
}

/**
 * At any point in the Stack you can ensure that an Fx runs in both success and failure
 */
export class FinalizerNode<R, E, A> {
  readonly tag = 'Finalizer'

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly finalizer: Finalizer,
    readonly previous: InstructionNode<R, E, A>,
    readonly exit: Atomic<Maybe<Exit<any, any>>>,
  ) {}
}

/**
 * Signals that the main process has completed and the Scope should be closed.
 */
export class ExitNode<E, A> {
  readonly tag = 'Exit'

  constructor(readonly exit: Exit<E, A>) {}
}
