import { Maybe, pipe } from 'hkt-ts'
import { isLeft } from 'hkt-ts/Either'
import { Nothing } from 'hkt-ts/Maybe'

import { Eff } from '../Eff.js'
import { Finalizer } from '../Instructions/Ensuring.js'

import { Instruction } from './Instruction.js'

import { Atomic, getAndSet, set } from '@/Atomic/Atomic.js'
import { CauseError } from '@/Cause/CauseError.js'
import { Exit } from '@/Exit/Exit.js'
import { Trace } from '@/Trace/Trace.js'

export type ProcessorStack<Y, R> =
  | ArbitraryEffNode<Y, R>
  | FinalizerNode<Y, R>
  | InitialNode<Y, R>
  | InstructionGeneratorNode<Y, R>
  | InstructionNode<Y, R>
  | RuntimeGeneratorNode<Y, R>
  | RuntimeInstructionNode<Y, R>

export class InitialNode<Y, R> {
  readonly tag = 'Initial'

  constructor(readonly eff: Eff<Y, R>) {}

  readonly forward = (trace: Maybe.Maybe<Trace>): InstructionGeneratorNode<Y, R> =>
    new InstructionGeneratorNode<Y, R>(this.eff[Symbol.iterator](), this, trace)
}

export type GeneratorMethod = 'next' | 'throw'

export class InstructionGeneratorNode<Y, R> {
  readonly tag = 'InstructionGenerator'

  protected _done = false
  protected _hasThrown = false

  readonly value: Atomic<any> = Atomic(undefined)
  readonly method: Atomic<GeneratorMethod> = Atomic<GeneratorMethod>('next')

  constructor(
    readonly generator: Generator<Y, R>,
    readonly previous: ProcessorStack<Y, any>,
    readonly trace: Maybe.Maybe<Trace>,
  ) {}

  readonly next = (): IteratorResult<Y, R> => {
    const method = pipe(this.method, getAndSet('next'))

    if (method === 'throw') {
      this._done = true
    }

    const result =
      method === 'throw'
        ? this.generator.throw(this.value.get())
        : tryGetResult(this.generator, this.value.get())

    this._done = result.done ?? false

    return result
  }

  readonly forward = (instruction: Y, trace: Maybe.Maybe<Trace>): InstructionNode<Y, any> =>
    new InstructionNode(instruction, trace, this)

  readonly back = (exit: Exit<any, any> | Exit<never, any>): ProcessorStack<Y, any> | undefined => {
    if (!this._done) {
      setExit<Y, R>(this, exit)

      return this
    }

    if (!this.previous || this.previous.tag === 'Initial') {
      return
    }

    return this.previous.back(exit)
  }
}

export class InstructionNode<Y, R> {
  readonly tag = 'Instruction'

  constructor(
    readonly instruction: Y,
    readonly trace: Maybe.Maybe<Trace>,
    readonly previous: InstructionGeneratorNode<Y, any>,
  ) {}

  readonly back = (exit: Exit<any, R> | Exit<never, R>): ProcessorStack<Y, any> | undefined => {
    return this.previous.back(exit)
  }
}

export class RuntimeGeneratorNode<Y, R> {
  readonly tag = 'RuntimeGenerator'

  protected _done = false

  readonly value: Atomic<any> = Atomic(undefined)
  readonly method: Atomic<GeneratorMethod> = Atomic<GeneratorMethod>('next')

  constructor(
    readonly generator: Generator<Instruction<Y, any, any>, R>,
    readonly previous: InstructionNode<Y, any> | RuntimeGeneratorNode<Y, R>,
  ) {}

  readonly next = (): IteratorResult<Instruction<Y, any, any>, R> => {
    const method = pipe(this.method, getAndSet('next'))

    if (method === 'throw') {
      this._done = true
    }

    const result =
      method === 'throw'
        ? this.generator.throw(this.value.get())
        : tryGetResult(this.generator, this.value.get())

    this._done = result.done ?? false

    return result
  }

  readonly forward = (
    instruction: Instruction<Y, any, any>,
    trace: Maybe.Maybe<Trace>,
  ): RuntimeInstructionNode<Y, any> => new RuntimeInstructionNode(instruction, trace, this)

  readonly back = (exit: Exit<any, any> | Exit<never, any>): ProcessorStack<Y, any> | undefined => {
    if (!this._done) {
      setExit<Y, R>(this, exit)

      return this
    }

    return this.previous.back(exit)
  }
}

export class RuntimeInstructionNode<Y, R> {
  readonly tag = 'RuntimeInstruction'

  constructor(
    readonly instruction: Instruction<Y, any, R>,
    readonly trace: Maybe.Maybe<Trace>,
    readonly previous: RuntimeGeneratorNode<Y, R>,
  ) {}

  readonly back = this.previous.back
}

function tryGetResult<Y, R>(gen: Generator<Y, R>, next: any) {
  try {
    return gen.next(next)
  } catch (e) {
    return gen.throw(e)
  }
}

function setExit<Y, R>(
  node: InstructionGeneratorNode<Y, R> | RuntimeGeneratorNode<Y, R>,
  exit: Exit<any, any> | Exit<never, any>,
) {
  pipe(node.method, set(exit.tag === 'Left' ? 'throw' : 'next'))
  pipe(node.value, set(exit.tag === 'Left' ? new CauseError(exit.left) : exit.right))
}

export class FinalizerNode<Y, R> {
  readonly tag = 'Finalizer'

  protected finalized: Maybe.Maybe<Exit<any, any>> = Maybe.Nothing

  constructor(
    readonly eff: Eff<Y, R>,
    readonly finalizer: Finalizer<Y>,
    readonly trace: Maybe.Maybe<Trace>,
    readonly previous: ProcessorStack<Y, any>,
  ) {}

  readonly forward = (): InstructionGeneratorNode<Y, R> =>
    new InstructionGeneratorNode(this.eff[Symbol.iterator](), this, this.trace)

  readonly back = (exit: Exit<any, any> | Exit<never, any>): ProcessorStack<Y, any> | undefined => {
    // If we've already run our finalizer, continue backwards
    if (Maybe.isJust(this.finalized)) {
      if (this.previous.tag === 'Initial') {
        return
      }

      return this.previous.back(this.finalized.value)
    }

    // The first time around we need to add our Finalizer to the Stack to be processed.
    this.finalized = Maybe.Just(exit)

    return new InstructionGeneratorNode(this.finalizer(exit)[Symbol.iterator](), this, this.trace)
  }
}

export class ArbitraryEffNode<Y, R> {
  readonly tag = 'ArbitraryEff'

  constructor(
    readonly eff: Eff<Y, R>,
    readonly previous: ProcessorStack<Y, R> | undefined,
    readonly onExit: (exit: Exit<any, R>) => void,
    readonly trace: Maybe.Maybe<Trace> = Nothing,
  ) {}

  readonly forward = (): InstructionGeneratorNode<Y, R> =>
    new InstructionGeneratorNode(this.eff[Symbol.iterator](), this, this.trace)

  readonly back = (exit: Exit<any, R>): ProcessorStack<Y, any> | undefined => {
    this.onExit(exit)

    if (!this.previous || this.previous.tag === 'Initial') {
      return
    }

    // Only forward back failures, otherwise allow it to be processed forward.
    return isLeft(exit) ? this.previous.back(exit) : this.previous
  }
}
