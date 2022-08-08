import { U } from 'ts-toolbelt'

import type { Fx } from '../Fx.js'

import type { Access, Provide } from './Access.js'
import type { AddTrace } from './AddTrace.js'
import type { Async } from './Async.js'
import { Ensuring } from './Ensuring.js'
import type { Failure } from './Failure.js'
import type { Fork } from './Fork.js'
import type { FromLazy } from './FromLazy.js'
import type { GetFiberContext } from './GetFiberContext.js'
import type { GetFiberScope } from './GetFiberScope.js'
import type { GetTrace } from './GetTrace.js'
import type { GetInterruptStatus, SetInterruptStatus } from './SetInterruptStatus.js'
import type { WithConcurrency } from './WithConcurrency.js'
import type { ZipAll } from './ZipAll.js'

import { ReturnOf, YieldOf } from '@/Eff/Eff.js'
import { RaceAll } from './RaceAll.js'

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
  | GetInterruptStatus
  | GetTrace
  | Provide<any, E, A>
  | RaceAll<ReadonlyArray<Fx<R, E, any>>>
  | SetInterruptStatus<R, E, A>
  | WithConcurrency<R, E, A>
  | ZipAll<ReadonlyArray<Fx<R, E, any>>>

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */

export type ResourcesFromInstruction<T> = T extends AnyInstruction
  ? '__R' extends keyof T
    ? ReturnType<NonNullable<T['__R']>> // Attempt to shortcut the inference process
    : ExtractEffResources<T>
  : never

export type ErrorsFromInstruction<T> = T extends AnyInstruction
  ? '__E' extends keyof T
    ? ReturnType<NonNullable<T['__E']>> // Attempt to shortcut the inference process
    : ExtractEffErrors<T>
  : never

export type OutputFromInstruction<T> = T extends AnyInstruction
  ? '__A' extends keyof T
    ? ReturnType<NonNullable<T['__A']>> // Attempt to shortcut the inference process
    : ReturnOf<T>
  : never

type ExtractEffResources<T, R = never> = U.ListOf<T> extends readonly [infer Head, ...infer Tail]
  ? ExtractEffResources<Tail[number], R | ExtractEffResources_<Head>>
  : R

type ExtractEffErrors<T, R = never> = U.ListOf<T> extends readonly [infer Head, ...infer Tail]
  ? ExtractEffErrors<Tail[number], R | ExtractEffErrors_<Head>>
  : R

type ExtractEffResources_<T> = T extends Access<infer R, infer R2, infer _E, infer _A>
  ? R | R2
  : T extends Async<infer _R, infer _E, infer _A>
  ? _R
  : T extends AddTrace<infer _R, infer _E, infer _A>
  ? _R
  : T extends Ensuring<infer _R, infer _E, infer _A>
  ? _R
  : T extends RaceAll<infer FX>
  ? ExtractEffResources<YieldOf<FX[number]>>
  : T extends SetInterruptStatus<infer _R, infer _E, infer _A>
  ? _R
  : T extends WithConcurrency<infer _R, infer _E, infer _A>
  ? _R
  : T extends ZipAll<infer FX>
  ? ExtractEffResources<YieldOf<FX[number]>>
  : never

type ExtractEffErrors_<T> = T extends Access<infer _R, infer _R2, infer _E, infer _A>
  ? _E
  : T extends Async<infer _R, infer _E, infer _A>
  ? _E
  : T extends AddTrace<infer _R, infer _E, infer _A>
  ? _E
  : T extends Ensuring<infer _R, infer _E, infer _A>
  ? _E
  : T extends Failure<infer _E>
  ? _E
  : T extends Provide<infer _R, infer _E, infer _A>
  ? _E
  : T extends RaceAll<infer FX>
  ? ExtractEffResources<YieldOf<FX[number]>>
  : T extends SetInterruptStatus<infer _R, infer _E, infer _A>
  ? _E
  : T extends WithConcurrency<infer _R, infer _E, infer _A>
  ? _E
  : T extends ZipAll<infer FX>
  ? ExtractEffResources<YieldOf<FX[number]>>
  : never

/* eslint-enable @typescript-eslint/no-unused-vars */
