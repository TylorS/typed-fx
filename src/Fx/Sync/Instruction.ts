/* eslint-disable @typescript-eslint/no-unused-vars */
import { FromLazy } from '../Eff/FromLazy.js'

import type { Env } from './Env.js'

import type { Access } from '@/Fx/Eff/Access.js'
import type { Failure } from '@/Fx/Eff/Failure.js'
import type { AddTrace, GetTrace } from '@/Fx/Eff/Trace.js'

export type Instruction<R, E, A> =
  | Access<Env<R>, Instruction<R, E, any>, A>
  | Failure<E>
  | FromLazy<A>
  | AddTrace
  | GetTrace

export type ResourcesFromInstruction<T> = T extends Access<
  infer R,
  Instruction<infer R2, infer _E2, infer _A2>,
  infer _A
>
  ? R | R2
  : never

export type ErrorsFromInstruction<T> = T extends Access<
  infer _R,
  Instruction<infer _R2, infer E2, infer _A2>,
  infer _A
>
  ? E2
  : T extends Failure<infer E>
  ? E
  : never

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>
