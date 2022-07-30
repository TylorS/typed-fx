/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Access } from './Access.js'
import type { Async } from './Async.js'
import type { Fork } from './Fork.js'
import type { GetFiberContext } from './GetFiberContext.js'
import type { GetFiberScope } from './GetFiberScope.js'
import type { Provide } from './Provide.js'
import type { SetInterruptStatus } from './SetInterruptStatus.js'
import type { WithConcurrency } from './WithConcurrency.js'
import type { ZipAll } from './ZipAll.js'

import type { Failure } from '@/Fx/Eff/Failure.js'
import type { FromLazy } from '@/Fx/Eff/FromLazy.js'
import type { AddTrace, GetTrace } from '@/Fx/Eff/Trace.js'

export type Instruction<R = never, E = never, A = never> =
  | Access<R, R, E, A>
  | AddTrace
  | Async<R, E, A>
  | Failure<E>
  | Fork<R, any, A>
  | FromLazy<A>
  | GetFiberContext
  | GetFiberScope
  | GetTrace
  | Provide<any, E, A>
  | SetInterruptStatus<R, E, A>
  | WithConcurrency<R, E, A>
  | ZipAll<R, E, A>

export type ResourcefulInstruction<R, E, A> =
  | Access<R, R, E, A>
  | Async<R, E, A>
  | Fork<R, E, A>
  | SetInterruptStatus<R, E, A>
  | WithConcurrency<R, E, A>
  | ZipAll<R, E, A>

export type AnyResourcefulInstruction =
  | ResourcefulInstruction<any, any, any>
  | ResourcefulInstruction<never, never, any>
  | ResourcefulInstruction<never, any, any>
  | ResourcefulInstruction<any, never, any>

export type FailureInstruction<R, E, A> =
  | Access<R, R, E, A>
  | Async<R, E, A>
  | Failure<E>
  | SetInterruptStatus<R, E, A>
  | WithConcurrency<R, E, A>
  | ZipAll<R, E, A>

export type AnyFailureInstruction =
  | FailureInstruction<any, any, any>
  | FailureInstruction<never, never, any>
  | FailureInstruction<never, any, any>
  | FailureInstruction<any, never, any>

export type VoidInstructions = AddTrace | GetFiberContext | GetTrace

export type ResourcesFromInstruction<T> = [Extract<T, AnyResourcefulInstruction>] extends [never]
  ? never
  : [Extract<T, AnyResourcefulInstruction>] extends ResourcefulInstruction<
      infer _R,
      infer _E,
      infer _A
    >
  ? _R
  : never

export type ErrorsFromInstruction<T> = [Extract<T, AnyFailureInstruction>] extends [never]
  ? never
  : [Extract<T, AnyFailureInstruction>] extends [FailureInstruction<infer _R, infer _E, infer _A>]
  ? _E
  : never
