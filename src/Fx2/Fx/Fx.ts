import { Either } from 'hkt-ts/Either'
import { Lazy } from 'hkt-ts/function'

import type { Env } from '../Env/Env.js'

import { Access } from './Instructions/Access.js'
import { AddTrace } from './Instructions/AddTrace.js'
import { Async, AsyncRegister } from './Instructions/Async.js'
import { Failure } from './Instructions/Failure.js'
import { FromLazy } from './Instructions/FromLazy.js'
import type {
  AnyInstruction,
  ErrorsFromInstruction,
  Instruction,
  ResourcesFromInstruction,
} from './Instructions/Instruction.js'

import { Cause } from '@/Cause/Cause.js'
import * as Eff from '@/Eff/index.js'
import * as Exit from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Trace } from '@/Trace/Trace.js'

export interface Fx<out R, out E, out A> extends Eff.Eff<Instruction<R, E, any>, A> {}

export interface IO<E, A> extends Fx<never, E, A> {}
export interface Of<A> extends Fx<never, never, A> {}

export type AnyFx =
  | Fx<any, any, any>
  | Fx<never, never, any>
  | Fx<never, any, any>
  | Fx<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */

export type ResourcesOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _R : never

export type ErrorsOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _E : never

export type OutputOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _A : never

/* eslint-enable @typescript-eslint/no-unused-vars */

export const access = <R, R2, E, A>(
  f: (r: Env<R>) => Fx<R2, E, A>,
  __trace?: string,
): Fx<R | R2, E, A> => new Access(f, __trace)

export const addTrace =
  (trace: Trace) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    new AddTrace([fx, trace])

export const addCustomTrace =
  (trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    trace ? addTrace(Trace.custom(trace))(fx) : fx

export const addRuntimeTrace =
  <E extends { readonly stack?: string }>(
    error: E = new Error() as any,
    // eslint-disable-next-line @typescript-eslint/ban-types
    targetObject?: Function,
  ) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    addTrace(Trace.runtime(error, targetObject))(fx)

export const async = <R, E, A>(register: AsyncRegister<R, E, A>, __trace?: string): Fx<R, E, A> =>
  new Async(register, __trace)

export const fromCause = <E>(cause: Cause<E>, __trace?: string): IO<E, never> =>
  new Failure(cause, __trace)

export const fromExit = <E, A>(exit: Exit.Exit<E, A>, __trace?: string): IO<E, A> =>
  exit.tag === 'Left' ? fromCause(exit.left, __trace) : fromValue(exit.right, __trace)

export const fail = <E>(error: E, __trace?: string): IO<E, never> =>
  fromExit(Exit.failure(error), __trace)

export const interrupt = (id: FiberId, __trace?: string): Of<never> =>
  fromExit(Exit.interrupt(id), __trace)

export const die = (error: unknown, __trace?: string): Of<never> =>
  fromExit(Exit.die(error), __trace)

export const fromEither = <E, A>(either: Either<E, A>, __trace?: string) =>
  fromExit(Exit.fromEither(either), __trace)

export const fromLazy = <A>(f: Lazy<A>, __trace?: string): Of<A> => new FromLazy(f, __trace)

export const fromValue = <A>(value: A, __trace?: string): Of<A> => fromLazy(() => value, __trace)

export const lazy = <R, E, A>(f: () => Fx<R, E, A>, __trace?: string) =>
  Fx(function* () {
    return yield* yield* fromLazy(f, __trace)
  })

export const success = fromValue

export function Fx<Y extends AnyInstruction, R>(
  f: () => Generator<Y, R>,
): Fx<ResourcesFromInstruction<Y>, ErrorsFromInstruction<Y>, R> {
  return Eff.Eff(f)
}
