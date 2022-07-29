/* eslint-disable @typescript-eslint/no-unused-vars */
import { FromLazy } from '../Eff/FromLazy.js'

import type * as Access from './Access.js'

import type { Failure } from '@/Fx/Eff/Failure.js'
import type { AddTrace, GetTrace } from '@/Fx/Eff/Trace.js'

export type Instruction<R, E, A> =
  | Access.Access<R, R, E, A>
  | Failure<E>
  | FromLazy<A>
  | AddTrace
  | GetTrace

type AnyAccess =
  | Access.Access<any, any, any, any>
  | Access.Access<never, never, never, any>
  | Access.Access<never, never, any, any>
  | Access.Access<any, never, never, any>
  | Access.Access<never, any, never, any>
  | Access.Access<never, any, any, any>
  | Access.Access<any, never, any, any>
  | Access.Access<any, any, never, any>
  | Access.Access<any, any, any, never>
  | Access.Access<never, never, never, never>
  | Access.Access<never, never, any, never>
  | Access.Access<any, never, never, never>
  | Access.Access<never, any, never, never>
  | Access.Access<never, any, any, never>
  | Access.Access<any, never, any, never>
  | Access.Access<any, any, never, never>

type AnyFailure = Failure<any> | Failure<never>

export type ResourcesFromInstruction<T> = [Extract<T, AnyAccess>] extends [never]
  ? never
  : [Extract<T, AnyAccess>] extends [Access.Access<infer R, infer R2, infer _E, infer _A>]
  ? R | R2
  : never

export type ErrorsFromInstruction<T> = [Extract<T, AnyFailure | AnyAccess>] extends [never]
  ? never
  : ErrorFromAccess<T> | ErrorFromFailure<T>

type ErrorFromAccess<T> = [Extract<T, AnyAccess>] extends [never]
  ? never
  : [Extract<T, AnyAccess>] extends [Access.Access<infer _R, infer _R2, infer _E, infer _A>]
  ? _E
  : never

type ErrorFromFailure<T> = [Extract<T, AnyFailure>] extends [never]
  ? never
  : [Extract<T, AnyFailure>] extends [Failure<infer E>]
  ? E
  : never

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>
