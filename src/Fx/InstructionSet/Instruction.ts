/* eslint-disable @typescript-eslint/no-unused-vars */
// TODO: Tracing

import type { Fx } from '../Fx'

import type { Access } from './Access'
import type { Async } from './Async'
import type { Fork } from './Fork'
import type { FromExit } from './FromExit'
import type { GetFiberContext } from './GetFiberContext'
import type { Provide } from './Provide'
import type { SetInterruptible } from './SetInterruptable'
import type { WithConcurrency } from './WithConcurrency'
import type { ZipAll } from './ZipAll'

export type Instruction<R = never, E = never, A = never> =
  | Access<R, R, E, A>
  | Async<R, E, A>
  | Fork<R, E, A>
  | FromExit<E, A>
  | GetFiberContext
  | Provide<never, E, A>
  | SetInterruptible<Fx<R, E, A>>
  | WithConcurrency<Fx<R, E, A>>
  | ZipAll<ReadonlyArray<Fx<R, E, A[keyof A]>>>

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>
