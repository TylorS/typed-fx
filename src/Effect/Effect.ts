import * as Either from 'hkt-ts/Either'
import * as F from 'hkt-ts/function'

import type { Future } from './Future.js'

import { Cause } from '@/Cause/index.js'
import { Exit } from '@/Exit/Exit.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Platform } from '@/Platform/Platform.js'
import { Stack } from '@/Stack/index.js'
import { StackTrace } from '@/Trace/Trace.js'
import { FiberId } from '@/index.js'

export type Effect<Fx extends Effect.IO<any, any, any>, E, A> =
  // Constructors
  | Effect.Now<A>
  | Effect.FromLazy<A>
  | Effect.FromCause<E>
  | Effect.Lazy<Fx, E, A>
  // Control Flow
  | Effect.Map<Fx, E, any, A>
  | Effect.FlatMap<Fx, E, any, Fx, E, A>
  | Effect.OrElse<Fx, any, A, Fx, E, A>
  | Effect.Match<Fx, any, any, Fx, E, A, Fx, E, A>
  | Effect.Wait<Fx, E, A>
  // Effects
  | Effect.Yield<Fx>
  | Effect.Handle<Fx, any, any, any, Fx, E, A>
  | Effect.GetHandlers<Fx>
  | Effect.GetTrace
  | Effect.GetPlatform
  | Effect.GetFiberId

export const now = <A>(a: A, __trace?: string) => Effect.Now(a, __trace)

export const fromLazy = <A>(a: () => A, __trace?: string) => Effect.FromLazy(a, __trace)

export const fromCause = <E>(e: Cause<E>, __trace?: string) => Effect.FromCause(e, __trace)

export const lazy = <Fx extends Effect.AnyIO, E, A>(f: () => Effect<Fx, E, A>, __trace?: string) =>
  Effect.Lazy(f, __trace)

export const map =
  <A, B>(f: (a: A) => B, __trace?: string) =>
  <Fx extends Effect.AnyIO, E>(effect: Effect<Fx, E, A>) =>
    Effect.Map(effect, f, __trace)

export const flatMap =
  <A, Fx2 extends Effect.AnyIO, E2, B>(f: (a: A) => Effect<Fx2, E2, B>, __trace?: string) =>
  <Fx extends Effect.AnyIO, E>(effect: Effect<Fx, E, A>) =>
    Effect.FlatMap(effect, f, __trace)

export const orElse =
  <E, Fx2 extends Effect.AnyIO, E2, B>(f: (e: Cause<E>) => Effect<Fx2, E2, B>, __trace?: string) =>
  <Fx extends Effect.AnyIO, A>(effect: Effect<Fx, E, A>) =>
    Effect.OrElse(effect, f, __trace)

export const match =
  <E, Fx2 extends Effect.AnyIO, E2, B, A, Fx3 extends Effect.AnyIO, E3, C>(
    onLeft: (e: Cause<E>) => Effect<Fx2, E2, B>,
    onRight: (a: A) => Effect<Fx3, E3, C>,
    __trace?: string,
  ) =>
  <Fx extends Effect.AnyIO>(effect: Effect<Fx, E, A>) =>
    Effect.Match(effect, onLeft, onRight, __trace)

export const wait = <Fx extends Effect.AnyIO, E, A>(
  effect: Future<Fx, E, A>,
  __trace?: string,
): Effect<Fx, E, A> => Effect.Wait(effect, __trace)

export const effect = <Tag extends string, E, A>(io: Effect.IO<Tag, E, A>, __trace?: string) =>
  Effect.Yield(io, __trace)

export { effect as yield }

export const handle =
  <Tag extends string, Fx2 extends Effect.AnyIO, E2, B>(
    handler: Effect.Handler<Tag, any, any, Fx2, E2, B>,
    __trace?: string,
  ) =>
  <Fx extends Effect.AnyIO, E, A>(
    effect: Effect<Fx, E, A>,
  ): Effect<Exclude<Fx | Fx2, { readonly tag: Tag }>, E, A> =>
    Effect.Handle(effect, handler, __trace)

export const handler = <Tag extends string, Fx2 extends Effect.AnyIO, E2, B>(
  tag: Tag,
  f: <E, A>(io: Effect.IO<Tag, E, A>) => Effect<Fx2, E2, B>,
): Effect.Handler<Tag, any, any, Fx2, E2, B> => new Effect.Handler(tag, f)

export const getHandlers = <Fx extends Effect.AnyIO>(__trace?: string) =>
  Effect.GetHandlers<Fx>(__trace)

export const getTrace = (__trace?: string) => Effect.GetTrace(__trace)

export const fromExit = <E, A>(exit: Exit<E, A>, __trace?: string): Effect<never, E, A> =>
  Either.isLeft(exit) ? fromCause(exit.left, __trace) : now(exit.right, __trace)

export namespace Effect {
  // #region Constructors

  export interface Now<A> {
    readonly tag: 'Now'
    readonly value: A
    readonly __trace?: string
  }

  export function Now<A>(value: A, __trace?: string): Effect<never, never, A> {
    return { tag: 'Now', value, __trace }
  }

  export interface FromLazy<A> {
    readonly tag: 'FromLazy'
    readonly f: F.Lazy<A>
    readonly __trace?: string
  }

  export function FromLazy<A>(f: F.Lazy<A>, __trace?: string): Effect<never, never, A> {
    return { tag: 'FromLazy', f, __trace }
  }

  export interface FromCause<E> {
    readonly tag: 'FromCause'
    readonly cause: Cause<E>
    readonly __trace?: string
  }

  export function FromCause<E>(cause: Cause<E>, __trace?: string): Effect<never, E, never> {
    return { tag: 'FromCause', cause, __trace }
  }

  export interface Lazy<Fx extends AnyIO, E, A> {
    readonly tag: 'Lazy'
    readonly f: F.Lazy<Effect<Fx, E, A>>
    readonly __trace?: string
  }

  export function Lazy<Fx extends AnyIO, E, A>(
    f: F.Lazy<Effect<Fx, E, A>>,
    __trace?: string,
  ): Effect<Fx, E, A> {
    return { tag: 'Lazy', f, __trace }
  }

  // #endregion Constructors

  // #region Control Flow

  export interface Map<Fx extends AnyIO, E, A, B> {
    readonly tag: 'Map'
    readonly effect: Effect<Fx, E, A>
    readonly f: (a: A) => B
    readonly __trace?: string
  }

  export function Map<Fx extends AnyIO, E, A, B>(
    effect: Effect<Fx, E, A>,
    f: (a: A) => B,
    __trace?: string,
  ): Effect<Fx, E, B> {
    const tag = effect.tag

    if (tag === 'Now') {
      return Now(f(effect.value), __trace)
    }

    if (tag === 'FromCause') {
      return effect
    }

    if (tag === 'Map') {
      return Map(effect.effect, F.flow(effect.f, f), __trace)
    }

    return { tag: 'Map', effect, f, __trace }
  }

  export interface FlatMap<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, B> {
    readonly tag: 'FlatMap'
    readonly effect: Effect<Fx, E, A>
    readonly f: (a: A) => Effect<Fx2, E2, B>
    readonly __trace?: string
  }

  export function FlatMap<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, B>(
    effect: Effect<Fx, E, A>,
    f: (a: A) => Effect<Fx2, E2, B>,
    __trace?: string,
  ): Effect<Fx | Fx2, E | E2, B> {
    const tag = effect.tag

    if (tag === 'FromCause') {
      return effect
    }

    if (tag === 'Map') {
      return FlatMap(effect.effect, F.flow(effect.f, f), __trace)
    }

    if (tag === 'OrElse') {
      return Match(effect.effect, effect.f, f, __trace) as Effect<Fx | Fx2, E | E2, B>
    }

    return { tag: 'FlatMap', effect, f, __trace }
  }

  export interface OrElse<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, A2> {
    readonly tag: 'OrElse'
    readonly effect: Effect<Fx, E, A>
    readonly f: (e: Cause<E>) => Effect<Fx2, E2, A2>
    readonly __trace?: string
  }

  export function OrElse<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, A2>(
    effect: Effect<Fx, E, A>,
    f: (e: Cause<E>) => Effect<Fx2, E2, A2>,
    __trace?: string,
  ): Effect<Fx | Fx2, E2, A | A2> {
    const tag = effect.tag

    if (tag === 'Now') {
      return effect
    }

    return { tag: 'OrElse', effect, f, __trace }
  }

  export interface Match<
    Fx extends AnyIO,
    E,
    A,
    Fx2 extends AnyIO,
    E2,
    B,
    Fx3 extends AnyIO,
    E3,
    C,
  > {
    readonly tag: 'Match'
    readonly effect: Effect<Fx, E, A>
    readonly onRight: (a: A) => Effect<Fx2, E2, B>
    readonly onLeft: (e: Cause<E>) => Effect<Fx3, E3, C>
    readonly __trace?: string
  }

  export function Match<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, B, Fx3 extends AnyIO, E3, C>(
    effect: Effect<Fx, E, A>,
    onLeft: (e: Cause<E>) => Effect<Fx3, E3, C>,
    onRight: (a: A) => Effect<Fx2, E2, B>,
    __trace?: string,
  ): Effect<Fx | Fx2 | Fx3, E2 | E3, B | C> {
    const tag = effect.tag

    if (tag === 'Map') {
      return Match(effect.effect, onLeft, F.flow(effect.f, onRight), __trace)
    }

    return { tag: 'Match', effect, onLeft, onRight, __trace }
  }

  export interface Wait<Fx extends AnyIO, E, A> {
    // Encode Fx/E/A as Covariant to avoid changing Variance of Effect
    readonly __Effect__: () => {
      readonly Fx: () => Fx
      readonly E: () => E
      readonly A: () => A
    }

    readonly tag: 'Wait'
    readonly future: Future<any, any, any>
    readonly __trace?: string
  }

  export function Wait<Fx extends AnyIO, E, A>(
    future: Future<Fx, E, A>,
    __trace?: string,
  ): Effect<Fx, E, A> {
    return { tag: 'Wait', future, __trace } as Wait<Fx, E, A>
  }

  // #endregion

  // #region Effects
  export abstract class IO<Tag extends string, E, A> {
    abstract readonly tag: Tag

    readonly __IO__!: {
      readonly _E: () => E
      readonly _A: () => A
    }

    constructor(readonly __trace?: string) {}

    *[Symbol.iterator](): Generator<Effect<this, E, A>, A, A> {
      return yield Yield(this, this.__trace)
    }
  }

  export type AnyIO = IO<any, any, any>

  export namespace IO {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    export type TagOf<T> = T extends IO<infer Tag, infer _E, infer _A> ? Tag : never
    export type ErrorsOf<T> = T extends IO<string, infer _E, infer _A> ? _E : never
    export type OutputOf<T> = T extends IO<string, infer _E, infer _A> ? _A : never
    /* eslint-enable @typescript-eslint/no-unused-vars */
  }

  export interface Yield<E> {
    readonly tag: 'Yield'
    readonly effect: E
    readonly __trace?: string
  }

  export function Yield<E extends AnyIO>(
    effect: E,
    __trace?: string,
  ): Effect<E, IO.ErrorsOf<E>, IO.OutputOf<E>> {
    return { tag: 'Yield', effect, __trace }
  }

  export function instr<Tag extends string>(tag: Tag) {
    return class Instruction<I, E, A> extends IO<Tag, E, A> {
      static tag: Tag = tag
      readonly tag: Tag = tag

      constructor(readonly input: I, readonly __trace?: string) {
        super(__trace)
      }
    }
  }

  export interface Handle<Fx extends AnyIO, E, A, Tag extends string, Fx2 extends AnyIO, E2, B> {
    readonly tag: 'Handle'
    readonly effect: Effect<Fx, E, A>
    readonly handler: Handler<Tag, E, A, Fx2, E2, B>
    readonly __trace?: string
  }

  export class Handler<Tag extends string, E, A, Fx extends AnyIO, E2, B> {
    constructor(readonly tag: Tag, readonly f: (i: IO<Tag, E, A>) => Effect<Fx, E2, B>) {}
  }

  export function Handle<Fx extends AnyIO, E, A, Tag extends string, Fx2 extends AnyIO, E2, B>(
    effect: Effect<Fx, E, A>,
    handler: Handler<Tag, E, A, Fx2, E2, B>,
    __trace?: string,
  ): Effect<Exclude<Fx | Fx2, { readonly tag: Tag }>, E, A> {
    return { tag: 'Handle', effect, handler, __trace } as any
  }

  export interface GetHandlers<Fx extends AnyIO> {
    readonly _Fx: () => Fx
    readonly tag: 'GetHandlers'
    readonly __trace?: string
  }

  export function GetHandlers<Fx extends AnyIO>(
    __trace?: string,
  ): Effect<Fx, never, HandlerMap<Fx>> {
    return { tag: 'GetHandlers', __trace } as GetHandlers<Fx>
  }

  export interface HandlerMap<Fx extends AnyIO>
    extends ImmutableMap<Fx['tag'], Stack<Handler<Fx['tag'], any, any, Fx, any, any>>> {}

  export interface GetTrace {
    readonly tag: 'GetTrace'
    readonly __trace?: string
  }

  export function GetTrace(__trace?: string): Effect<never, never, StackTrace> {
    return { tag: 'GetTrace', __trace }
  }

  export interface GetPlatform {
    readonly tag: 'GetPlatform'
    readonly __trace?: string
  }

  export function GetPlatform(__trace?: string): Effect<never, never, Platform> {
    return { tag: 'GetPlatform', __trace }
  }

  export interface GetFiberId {
    readonly tag: 'GetFiberId'
    readonly __trace?: string
  }

  export function GetFiberId(__trace?: string): Effect<never, never, FiberId.Live> {
    return { tag: 'GetFiberId', __trace }
  }
  // #endregion
}
