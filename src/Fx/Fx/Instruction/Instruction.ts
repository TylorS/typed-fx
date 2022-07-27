/* eslint-disable @typescript-eslint/no-unused-vars */
import { Async } from './Async.js'
import { Fork } from './Fork.js'
import { GetScope } from './GetScope.js'
import { SetInterruptStatus } from './SetInterruptStatus.js'
import { WithConcurrency } from './WithConcurrency.js'
import { ZipAll } from './ZipAll.js'

import { Access } from '@/Fx/Eff/Access.js'
import { Failure } from '@/Fx/Eff/Failure.js'
import { AddTrace, GetTrace } from '@/Fx/Eff/Trace.js'
import { Env } from '@/Fx/Env/Env.js'

export type Instruction<R, E, A> =
  | Access<Env<R>, Instruction<R, E, any>, A>
  | AddTrace
  | Async<R, E, A>
  | Failure<E>
  | Fork<R, unknown, A>
  | GetScope
  | GetTrace
  | SetInterruptStatus<R, E, A>
  | WithConcurrency<R, E, A>
  | ZipAll<R, E, A>

export type ResourcesFromInstruction<T> = T extends Access<
  Env<infer _R>,
  Instruction<infer _R2, infer _E, any>,
  infer _A
>
  ? _R | _R2
  : T extends Async<infer _R, infer _E, infer _A>
  ? _R
  : T extends SetInterruptStatus<infer _R, infer _E, infer _A>
  ? _R
  : T extends WithConcurrency<infer _R, infer _E, infer _A>
  ? _R
  : T extends ZipAll<infer _R, infer _E, infer _A>
  ? _R
  : never

export type ErrorsFromInstruction<T> = T extends Failure<infer E>
  ? E
  : T extends Access<Env<infer _R>, Instruction<infer _R2, infer _E, any>, infer _A>
  ? _E
  : T extends Async<infer _R, infer _E, infer _A>
  ? _E
  : T extends SetInterruptStatus<infer _R, infer _E, infer _A>
  ? _E
  : T extends WithConcurrency<infer _R, infer _E, infer _A>
  ? _E
  : T extends ZipAll<infer _R, infer _E, infer _A>
  ? _E
  : never

export type OutputOfFromInsruction<T> = T extends Instruction<infer _R, infer _E, infer _A>
  ? _A
  : never
