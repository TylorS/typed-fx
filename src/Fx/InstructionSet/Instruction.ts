/* eslint-disable @typescript-eslint/no-unused-vars */
// TODO: GetContext
// TODO: GetRuntime
// TODO: Tracing

import type { Fx } from '../Fx'

import type { Access } from './Access'
import { Async } from './Async'
import { Fork } from './Fork'
import type { FromExit } from './FromExit'
import { GetFiberContext } from './GetFiberContext'
import { Provide } from './Provide'
import { SetInterruptible } from './SetInterruptable'
import { WithConcurrency } from './WithConcurrency'
import { ZipAll } from './ZipAll'

export type Instruction<R = never, E = never, A = never> =
  | Access<R, R, E, A>
  | Async<R, E, A>
  | Fork<R, E, A>
  | FromExit<E, A>
  | GetFiberContext
  | Provide<never, E, A>
  | SetInterruptible<Fx<R, E, A>>
  | WithConcurrency<Fx<R, E, A>>
  | ZipAll<ReadonlyArray<Fx<R, E, any>>>

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>
