import type { NonEmptyArray } from 'hkt-ts/NonEmptyArray'

import type { Access, Provide } from './Access.js'
import type { AddTrace } from './AddTrace.js'
import type { Async } from './Async.js'
import type { Ensuring } from './Ensuring.js'
import type { Failure } from './Failure.js'
import type { Fork } from './Fork.js'
import type { FromLazy } from './FromLazy.js'
import type { GetFiberContext } from './GetFiberContext.js'
import type { GetFiberScope } from './GetFiberScope.js'
import type { GetTrace } from './GetTrace.js'
import type { Join } from './Join.js'
import type { RaceAll } from './RaceAll.js'
import type { SetInterruptStatus } from './SetInterruptStatus.js'
import type { Wait } from './Wait.js'
import type { WithConcurrency } from './WithConcurrency.js'
import type { ZipAll } from './ZipAll.js'

import type { Fx } from '@/Fx/Fx.js'

export type Instruction<R, E, A> =
  | Access<R, R, E, A>
  | AddTrace<R, E, A>
  | Async<R, E, A>
  | Ensuring<R, E, A>
  | Failure<E>
  | Fork<R, any, A>
  | FromLazy<A>
  | GetFiberContext
  | GetFiberScope
  | GetTrace
  | Join<E, A>
  | Provide<any, E, A>
  | RaceAll<NonEmptyArray<Fx<R, E, any>>>
  | SetInterruptStatus<R, E, A>
  | Wait<R, E, A>
  | WithConcurrency<R, E, A>
  | ZipAll<ReadonlyArray<Fx<R, E, any>>>

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */

export type ResourcesFromInstruction<T extends AnyInstruction> = ReturnType<T['__R']> // Attempt to shortcut the inference process

export type ErrorsFromInstruction<T extends AnyInstruction> = ReturnType<T['__E']> // Attempt to shortcut the inference process

export type OutputFromInstruction<T extends AnyInstruction> = ReturnType<T['__A']> // Attempt to shortcut the inference process

/* eslint-enable @typescript-eslint/no-unused-vars */
