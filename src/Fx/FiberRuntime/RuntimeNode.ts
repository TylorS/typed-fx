import { Strict } from 'hkt-ts/Typeclass/Eq'

import { Exit } from '../Exit/Exit.js'

import { RuntimeInstruction } from './RuntimeInstruction.js'

import { Atomic } from '@/Atomic/Atomic.js'

/**
 * The RuntimeNode acts as a Stack of sorts which keeps track of the execution of nested generators
 * from Eff's that can fail.
 */
export type RuntimeNode<Ctx, T, I> =
  | InitialNode<T>
  | GeneratorNode<Ctx, T, I>
  | InstructionNode<Ctx, T, I>
  | RuntimeGeneratorNode<Ctx, T, I>
  | RuntimeInstructionNode<Ctx, T, I>
  | ExitNode

export class InitialNode<T> {
  readonly tag = 'Initial'

  constructor(readonly fx: T) {}
}

export class GeneratorNode<Ctx, T, I> {
  readonly tag = 'Generator'

  constructor(
    readonly generator: Generator<I, any>,
    readonly previous:
      | InitialNode<T>
      | GeneratorNode<Ctx, T, I>
      | RuntimeGeneratorNode<Ctx, T, I>
      | ExitNode
      | undefined,
    readonly next: Atomic<any> = new Atomic(undefined, Strict),
    readonly method: Atomic<'next' | 'throw'> = new Atomic<'next' | 'throw'>('next', Strict),
  ) {}
}

export class InstructionNode<Ctx, T, I> {
  readonly tag = 'Instruction'

  constructor(readonly instruction: I, readonly previous: GeneratorNode<Ctx, T, I>) {}
}

export class RuntimeGeneratorNode<Ctx, T, I> {
  readonly tag = 'RuntimeGenerator'

  constructor(
    readonly generator: Generator<RuntimeInstruction<Ctx, T, any, any>, any>,
    readonly previous: InstructionNode<Ctx, T, I> | RuntimeGeneratorNode<Ctx, T, I>,
    readonly next: Atomic<any> = new Atomic(undefined, Strict),
    readonly method: Atomic<'next' | 'throw'> = new Atomic<'next' | 'throw'>('next', Strict),
  ) {}
}

export class RuntimeInstructionNode<Ctx, T, I> {
  readonly tag = 'RuntimeInstruction'

  constructor(
    readonly instruction: RuntimeInstruction<Ctx, T, any, any>,
    readonly previous: RuntimeGeneratorNode<Ctx, T, I>,
  ) {}
}

export class ExitNode {
  readonly tag = 'Exit'

  constructor(readonly exit: Exit<any, any>) {}
}
