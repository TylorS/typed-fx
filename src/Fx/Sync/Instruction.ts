import type { Access } from '@/Fx/Eff/Access.js'
import type { Failure } from '@/Fx/Eff/Failure.js'
import type { AddTrace, GetTrace } from '@/Fx/Eff/Trace.js'

export type Instruction<R, E, A> = Access<R, R, E, A> | Failure<E> | AddTrace | GetTrace

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ResourcesFromInstruction<T> = T extends Access<infer R, infer R2, infer _E, infer _A>
  ? R | R2
  : never

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ErrorsFromInstruction<T> = T extends Access<infer _R, infer _R2, infer _E, infer _A>
  ? _E
  : T extends Failure<infer E>
  ? E
  : never

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>
