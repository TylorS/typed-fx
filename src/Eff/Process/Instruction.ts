import { U } from 'ts-toolbelt'

import { Ensuring } from '../Instructions/Ensuring.js'
import { SetInterruptStatus } from '../Instructions/SetInterruptStatus.js'

import { Eff } from '@/Eff/Eff.js'
import { Async } from '@/Eff/Instructions/Async.js'
import { Failure } from '@/Eff/Instructions/Failure.js'
import { FromLazy } from '@/Eff/Instructions/FromLazy.js'
import { AddTrace, GetTrace } from '@/Eff/Instructions/Trace.js'

export type Instruction<Y, E, R> =
  | AddTrace<Y, R>
  | Async<Y, R, Y>
  | Ensuring<Y, R, Y>
  | Failure<E>
  | FromLazy<R>
  | GetTrace
  | PushInstruction<Y, R>
  | SetInterruptStatus<Y, R>

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, any, never>
  | Instruction<never, any, any>
  | Instruction<any, any, never>
  | Instruction<any, never, any>
  | Instruction<never, never, never>
  | Instruction<never, never, any>
  | Instruction<any, never, never>

export type ErrorsFromInstruction<T, R = never> = [T] extends [never]
  ? never
  : U.ListOf<T> extends readonly [infer Head, ...infer Tail]
  ? [Head] extends [Failure<infer E>]
    ? ErrorsFromInstruction<Tail[number], R | E>
    : ErrorsFromInstruction<Tail[number], R>
  : R

export class PushInstruction<Y, R> extends Eff.Instruction<Eff<Y, R>, R> {
  readonly tag = 'PushInstruction'
}
