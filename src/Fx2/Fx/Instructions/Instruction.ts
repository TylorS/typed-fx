import { U } from 'ts-toolbelt'

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

import { ReturnOf, YieldOf } from '@/Eff/Eff.js'

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
  : T extends Failure<infer _E>
  ? _E
  : T extends Provide<infer _R, infer _E, infer _A>
  ? _E
  : T extends SetInterruptStatus<infer _R, infer _E, infer _A>
  ? _E
  : T extends WithConcurrency<infer _R, infer _E, infer _A>
  ? _E
  : T extends ZipAll<infer FX>
  ? ExtractEffResources<YieldOf<FX[number]>>
  : never

/* eslint-enable @typescript-eslint/no-unused-vars */
