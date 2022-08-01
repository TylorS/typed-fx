import type { Fx } from '../Fx.js'

import { Access } from './Access.js'
import { AddTrace } from './AddTrace.js'
import { Async } from './Async.js'
import { Failure } from './Failure.js'
import { FromLazy } from './FromLazy.js'
import { GetTrace } from './GetTrace.js'
import { Provide } from './Provide.js'
import { SetInterruptStatus } from './SetInterruptStatus.js'
import { WithConcurrency } from './WithConcurrency.js'
import { ZipAll } from './ZipAll.js'

export type Instruction<R, E, A> =
  | Access<R, R, E, A>
  | AddTrace
  | Async<R, E, A>
  | Failure<E>
  | FromLazy<A>
  | GetTrace
  | Provide<any, E, A>
  | SetInterruptStatus<R, E, A>
  | WithConcurrency<R, E, A>
  | ZipAll<ReadonlyArray<Fx<R, E, any>>>

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */

export type ResourcesFromInstruction<T> = T extends Instruction<infer _R, infer _E, infer _A>
  ? ReturnType<NonNullable<T['__R']>>
  : never

export type ErrorsFromInstruction<T> = T extends Instruction<infer _R, infer _E, infer _A>
  ? ReturnType<NonNullable<T['__E']>>
  : never

export type OutputFromInstruction<T> = T extends Instruction<infer _R, infer _E, infer _A>
  ? ReturnType<NonNullable<T['__A']>>
  : never

/* eslint-enable @typescript-eslint/no-unused-vars */
