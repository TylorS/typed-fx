import { Strict } from 'hkt-ts/Typeclass/Eq'

import { YieldOf } from '../Eff/Eff.js'
import { Exit } from '../Exit/Exit.js'

import { RuntimeInstruction } from './RuntimeInstruction.js'

import { Atomic } from '@/Atomic/Atomic.js'

/**
 * The RuntimeNode acts as a Stack of sorts which keeps track of the execution of nested generators
 * from Eff's that can fail.
 */
export type RuntimeNode<Ctx, T> =
  | InitialNode<T>
  | GeneratorNode<Ctx, T>
  | InstructionNode<Ctx, T>
  | RuntimeGeneratorNode<Ctx, T>
  | RuntimeInstructionNode<Ctx, T>
  | ExitNode

export class InitialNode<T> {
  readonly tag = 'Initial'

  constructor(readonly fx: T) {}
}

export class GeneratorNode<Ctx, T> {
  readonly tag = 'Generator'

  constructor(
    readonly generator: Generator<YieldOf<T>, any>,
    readonly previous:
      | InitialNode<T>
      | GeneratorNode<Ctx, T>
      | RuntimeGeneratorNode<Ctx, T>
      | ExitNode
      | undefined,
    readonly next: Atomic<any> = new Atomic(undefined, Strict),
    readonly method: Atomic<'next' | 'throw'> = new Atomic<'next' | 'throw'>('next', Strict),
  ) {}
}

export class InstructionNode<Ctx, T> {
  readonly tag = 'Instruction'

  constructor(readonly instruction: YieldOf<T>, readonly previous: GeneratorNode<Ctx, T>) {}
}

export class RuntimeGeneratorNode<Ctx, T> {
  readonly tag = 'RuntimeGenerator'

  constructor(
    readonly generator: Generator<RuntimeInstruction<Ctx, T, any, any>, any>,
    readonly previous: InstructionNode<Ctx, T> | RuntimeGeneratorNode<Ctx, T>,
    readonly next: Atomic<any> = new Atomic(undefined, Strict),
    readonly method: Atomic<'next' | 'throw'> = new Atomic<'next' | 'throw'>('next', Strict),
  ) {}
}

export class RuntimeInstructionNode<Ctx, T> {
  readonly tag = 'RuntimeInstruction'

  constructor(
    readonly instruction: RuntimeInstruction<Ctx, T, any, any>,
    readonly previous: RuntimeGeneratorNode<Ctx, T>,
  ) {}
}

export class ExitNode {
  readonly tag = 'Exit'

  constructor(readonly exit: Exit<any, any>) {}
}
