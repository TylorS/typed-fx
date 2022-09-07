/* eslint-disable @typescript-eslint/no-unused-vars */
import * as E from 'hkt-ts/Either'
import { DeepEquals } from 'hkt-ts/Typeclass/Eq'
import * as F from 'hkt-ts/function'
import { InstanceOf } from 'ts-morph'

import type { EffectContext } from './EffectContext.js'
import type { EffectRef } from './EffectRef.js'
import type { EffectRefs } from './EffectRefs.js'
import type { EffectScope } from './EffectScope.js'
import type { Fiber } from './Fiber.js'
import type { Future } from './Future.js'

import { getCauseError } from '@/Cause/CauseError.js'
import * as Cause from '@/Cause/index.js'
import * as Exit from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Platform } from '@/Platform/Platform.js'
import { Stack } from '@/Stack/index.js'
import { StackTrace, Trace } from '@/Trace/Trace.js'

export type Effect<Fx extends Effect.AnyIO, E, A> =
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
  | Effect.Both<Fx, E, any, Fx, E, any, A>
  | Effect.Either<Fx, E, any, Fx, E, any, A>
  | Effect.Fork<any, any, any>
  // Effects
  | Effect.Yield<Fx>
  | Effect.Handle<Fx, any, any, any, Fx, E, A>
  | Effect.GetHandlers<Fx>
  // Refs
  | Effect.GetEffectRefs
  | Effect.EffectRefLocally<Fx, E, A, any, any, any>
  // Tracing
  | Effect.GetTrace
  | Effect.AddTrace<Fx, E, A>
  // Interruption
  | Effect.GetInterruptStatus
  | Effect.SetInterruptStatus<Fx, E, A>
  // Intrinstics
  | Effect.GetFiberId
  | Effect.GetFiberChildren
  | Effect.GetPlatform

type NoYields =
  | Effect.GetFiberId
  | Effect.GetFiberChildren
  | Effect.GetPlatform
  | Effect.GetTrace
  | Effect.GetInterruptStatus
  | Effect.Now<any>
  | Effect.FromLazy<any>
  | Effect.FromCause<any>
  | Effect.Fork<any, any, any>

export type YieldOf<T> = [Exclude<T, NoYields>] extends [never]
  ? never
  : Exclude<T, NoYields> extends Effect<infer _Y, infer _E, infer _A>
  ? _Y
  : never

type NoErrors =
  | Effect.GetFiberId
  | Effect.GetFiberChildren
  | Effect.GetPlatform
  | Effect.GetTrace
  | Effect.GetInterruptStatus
  | Effect.Now<any>
  | Effect.FromLazy<any>
  | Effect.Yield<any>
  | Effect.GetHandlers<any>
  | Effect.Fork<any, any, any>

export type ErrorsOf<T> = [Exclude<T, NoErrors>] extends [never]
  ? [never]
  : [Exclude<T, NoErrors>] extends [Effect<infer _Y, infer _E, infer _A>]
  ? _E
  : never

export type OutputOf<T> = [T] extends [Effect<infer _Y, infer _E, infer _A>] ? _A : never

type YieldFromGenerator<T> = T extends Generator<infer Y, infer _R, infer _N> ? Y : never
type ReturnFromGenerator<T> = T extends Generator<infer _Y, infer R, infer _N> ? R : never

export function Effect<G extends Generator<Effect<any, any, any>, any>>(
  f: (_: typeof liftEffect) => G,
  __trace?: string,
): Effect<YieldOf<YieldFromGenerator<G>>, ErrorsOf<YieldFromGenerator<G>>, ReturnFromGenerator<G>> {
  return Effect.Lazy(() => {
    const gen = f(liftEffect)

    return F.pipe(
      runEffectGenerator(gen, gen.next()),
      orElse((cause) => {
        const error = getCauseError(cause)

        return Cause.shouldRethrow(cause)
          ? F.pipe(
              lazy(() => runEffectGenerator(gen, gen.throw(error))),
              orElse((inner) =>
                // Ensure the the most useful error is continued up the stack
                DeepEquals.equals(getCauseError(inner), error)
                  ? fromCause(cause)
                  : fromCause(Cause.sequential(cause, inner)),
              ),
            )
          : fromCause(cause)
      }),
    )
  }, __trace)
}

function* liftEffect<Fx extends Effect.AnyIO, E, A>(
  eff: Effect<Fx, E, A>,
): Generator<Effect<Fx, E, A>, A, A> {
  return yield eff
}

function runEffectGenerator<Fx extends Effect.AnyIO, E, A>(
  gen: Generator<Effect<Fx, E, any>, A>,
  result: IteratorResult<Effect<Fx, E, any>, A>,
): Effect<Fx, E, A> {
  if (result.done) {
    return Effect.Now(result.value)
  }

  return Effect.FlatMap(result.value, (a) => runEffectGenerator(gen, gen.next(a)))
}

export const now = <A>(a: A, __trace?: string) => Effect.Now(a, __trace)

export const fromLazy = <A>(a: () => A, __trace?: string) => Effect.FromLazy(a, __trace)

export const fromCause = <E>(e: Cause.Cause<E>, __trace?: string) => Effect.FromCause(e, __trace)

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
  <E, Fx2 extends Effect.AnyIO, E2, B>(
    f: (e: Cause.Cause<E>) => Effect<Fx2, E2, B>,
    __trace?: string,
  ) =>
  <Fx extends Effect.AnyIO, A>(effect: Effect<Fx, E, A>) =>
    Effect.OrElse(effect, f, __trace)

export const match =
  <E, Fx2 extends Effect.AnyIO, E2, B, A, Fx3 extends Effect.AnyIO, E3, C>(
    onLeft: (e: Cause.Cause<E>) => Effect<Fx2, E2, B>,
    onRight: (a: A) => Effect<Fx3, E3, C>,
    __trace?: string,
  ) =>
  <Fx extends Effect.AnyIO>(effect: Effect<Fx, E, A>) =>
    Effect.Match(effect, onLeft, onRight, __trace)

export const wait = <Fx extends Effect.AnyIO, E, A>(
  effect: Future<Fx, E, A>,
  __trace?: string,
): Effect<Fx, E, A> => Effect.Wait(effect, __trace)

export const both =
  <Fx2 extends Effect.AnyIO, E2, A2>(second: Effect<Fx2, E2, A2>, __trace?: string) =>
  <Fx extends Effect.AnyIO, E, A>(first: Effect<Fx, E, A>) =>
    Effect.Both(first, second, __trace)

export const either =
  <Fx2 extends Effect.AnyIO, E2, A2>(second: Effect<Fx2, E2, A2>, __trace?: string) =>
  <Fx extends Effect.AnyIO, E, A>(
    first: Effect<Fx, E, A>,
  ): Effect<Fx | Fx2, E | E2, E.Either<A, A2>> =>
    Effect.Either(first, second, __trace)

export const forkWithParams =
  (params: Effect.ForkParams, __trace?: string) =>
  <Fx extends Effect.AnyIO, E, A>(effect: Effect<Fx, E, A>): Effect<Fx, never, Fiber<E, A>> =>
    Effect.Fork(effect, params, __trace)

export const fork = <Fx extends Effect.AnyIO, E, A>(
  effect: Effect<Fx, E, A>,
  __trace?: string,
): Effect<Fx, never, Fiber<E, A>> => Effect.Fork(effect, undefined, __trace)

export const effect = <Tag extends string, E, A>(io: Effect.IO<Tag, E, A>, __trace?: string) =>
  Effect.Yield(io, __trace)

export { effect as yield }

export const handle =
  <Tag extends string, E_, A_, Fx2 extends Effect.AnyIO, E2, B>(
    handler: Effect.Handler<Tag, E_, A_, Fx2, E2, B>,
    __trace?: string,
  ) =>
  <Fx extends Effect.AnyIO, E, A>(
    effect: Effect<Fx, E, A>,
  ): Effect<Exclude<Fx | Fx2, { readonly tag: Tag }>, E | E2, A> =>
    Effect.Handle(effect, handler, __trace) as Effect<
      Exclude<Fx | Fx2, { readonly tag: Tag }>,
      E | E2,
      A
    >

export const handler = <
  Instr extends {
    readonly tag: string
    new (...args: any): Effect.AnyIO
  },
  Fx2 extends Effect.AnyIO,
  E2,
  B,
>(
  instr: Instr,
  f: (io: InstanceType<Instr>) => Effect<Fx2, E2, B>,
): Effect.Handler<
  Instr['tag'],
  Effect.IO.ErrorsOf<InstanceType<Instr>>,
  Effect.IO.OutputOf<InstanceType<Instr>>,
  Fx2,
  E2,
  B
> => new Effect.Handler(instr.tag, f as any)

export const getHandlers = <Fx extends Effect.AnyIO>(__trace?: string) =>
  Effect.GetHandlers<Fx>(__trace)

export const getEffectRefs = (__trace?: string) => Effect.GetEffectRefs(__trace)

export const effectRefLocally =
  <Fx2 extends Effect.AnyIO, E2, B>(ref: EffectRef<Fx2, E2, B>, value: B, __trace?: string) =>
  <Fx extends Effect.AnyIO, E, A>(effect: Effect<Fx, E, A>) =>
    Effect.EffectRefLocally(effect, ref, value, __trace)

export const getTrace = (__trace?: string) => Effect.GetTrace(__trace)

export const addTrace =
  (trace: Trace) =>
  <Fx extends Effect.AnyIO, E, A>(effect: Effect<Fx, E, A>) =>
    Effect.AddTrace<Fx, E, A>(effect, trace)

export const addCustomTrace =
  (trace?: string) =>
  <Fx extends Effect.AnyIO, E, A>(effect: Effect<Fx, E, A>): Effect<Fx, E, A> =>
    trace ? addTrace(Trace.custom(trace))(effect) : effect

export const fromExit = <E, A>(exit: Exit.Exit<E, A>, __trace?: string): Effect<never, E, A> =>
  E.isLeft(exit) ? fromCause(exit.left, __trace) : now(exit.right, __trace)

export const fromEither = <E, A>(either: E.Either<E, A>, __trace?: string): Effect<never, E, A> =>
  fromExit(Exit.fromEither(either), __trace)

export namespace Effect {
  export type Of<A> = Effect<never, never, A>

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
    readonly cause: Cause.Cause<E>
    readonly __trace?: string
  }

  export function FromCause<E>(cause: Cause.Cause<E>, __trace?: string): Effect<never, E, never> {
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

    return { tag: 'FlatMap', effect, f, __trace }
  }

  export interface OrElse<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, A2> {
    readonly tag: 'OrElse'
    readonly effect: Effect<Fx, E, A>
    readonly f: (e: Cause.Cause<E>) => Effect<Fx2, E2, A2>
    readonly __trace?: string
  }

  export function OrElse<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, A2>(
    effect: Effect<Fx, E, A>,
    f: (e: Cause.Cause<E>) => Effect<Fx2, E2, A2>,
    __trace?: string,
  ): Effect<Fx | Fx2, E2, A | A2> {
    const tag = effect.tag

    if (tag === 'Now') {
      return effect
    }

    if (tag === 'FlatMap') {
      return Match(effect.effect, f, effect.f, __trace) as Effect<Fx | Fx2, E2, A | A2>
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
    readonly onLeft: (e: Cause.Cause<E>) => Effect<Fx3, E3, C>
    readonly __trace?: string
  }

  export function Match<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, B, Fx3 extends AnyIO, E3, C>(
    effect: Effect<Fx, E, A>,
    onLeft: (e: Cause.Cause<E>) => Effect<Fx3, E3, C>,
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

  export interface Fork<Fx extends AnyIO, E, A> {
    readonly tag: 'Fork'
    readonly effect: Effect<Fx, E, A>
    readonly params?: ForkParams
    readonly __trace?: string
  }

  export interface Both<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, A2, C> {
    readonly __A: () => C

    readonly tag: 'Both'
    readonly left: Effect<Fx, E, A>
    readonly right: Effect<Fx2, E2, A2>
    readonly __trace?: string
  }

  export function Both<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, A2>(
    left: Effect<Fx, E, A>,
    right: Effect<Fx2, E2, A2>,
    __trace?: string,
  ): Effect<Fx | Fx2, E | E2, readonly [A, A2]> {
    return { tag: 'Both', left, right, __trace } as Both<Fx, E, A, Fx2, E2, A2, readonly [A, A2]>
  }

  export interface Either<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, A2, C> {
    readonly __A: () => C

    readonly tag: 'Either'
    readonly left: Effect<Fx, E, A>
    readonly right: Effect<Fx2, E2, A2>
    readonly __trace?: string
  }

  export function Either<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, A2>(
    left: Effect<Fx, E, A>,
    right: Effect<Fx2, E2, A2>,
    __trace?: string,
  ): Effect<Fx | Fx2, E | E2, E.Either<A, A2>> {
    return { tag: 'Either', left, right, __trace } as Either<Fx, E, A, Fx2, E2, A2, E.Either<A, A2>>
  }

  export function Fork<Fx extends AnyIO, E, A>(
    effect: Effect<Fx, E, A>,
    params?: ForkParams,
    __trace?: string,
  ): Effect<Fx, never, Fiber<E, A>> {
    return { tag: 'Fork', effect, params, __trace }
  }

  export interface ForkParams extends Partial<EffectContext> {
    readonly forkScope?: EffectScope<any, any>
    readonly async?: boolean
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
    type InputOf<T> = T extends {
      new (input: infer I): any
    }
      ? [input: I, __trace?: string]
      : [input: void, __trace?: string]

    type AnyInstructionConstructor = {
      readonly tag: string
      new (input: any, __trace?: string): AnyIO
    }

    return class Instruction<I, E, A> extends IO<Tag, E, A> {
      static tag: Tag = tag
      readonly tag: Tag = tag

      constructor(readonly input: I, readonly __trace?: string) {
        super(__trace)
      }

      static make<T extends AnyInstructionConstructor>(
        this: T,
        ...args: InputOf<T>
      ): InstanceOf<T> {
        return new (this as any)(...args) as InstanceOf<T>
      }

      static handle<T extends AnyInstructionConstructor, Fx2 extends Effect.AnyIO, E2, B>(
        this: T,
        f: (io: InstanceType<T>) => Effect<Fx2, E2, B>,
        __trace?: string,
      ) {
        return handle(handler(this, f), __trace)
      }

      is<T2 extends AnyInstructionConstructor>(that: T2): this is InstanceOf<T2> {
        return this.tag === that.tag
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

  export namespace Handler {
    /* eslint-disable @typescript-eslint/no-unused-vars */

    export type TagOf<T> = T extends Handler<
      infer _Tag,
      infer _E,
      infer _A,
      infer _Fx,
      infer _E2,
      infer _A
    >
      ? _Tag
      : never

    export type EffectsOf<T> = T extends Handler<
      infer _Tag,
      infer _E,
      infer _A,
      infer _Fx,
      infer _E2,
      infer _A
    >
      ? _Fx
      : never

    /* eslint-enable @typescript-eslint/no-unused-vars */
  }

  export type AnyHandler = Handler<any, any, any, any, any, any>

  export function Handle<
    Fx extends AnyIO,
    E,
    A,
    Tag extends string,
    E_,
    A_,
    Fx2 extends AnyIO,
    E2,
    B,
  >(
    effect: Effect<Fx, E, A>,
    handler: Handler<Tag, E_, A_, Fx2, E2, B>,
    __trace?: string,
  ): Effect<Exclude<Fx | Fx2, { readonly tag: Tag }>, E | E2, A> {
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

  export function HandlerMap<Handlers extends ReadonlyArray<AnyHandler>>(
    ...handlers: Handlers
  ): HandlerMap<Handler.EffectsOf<Handlers[number]>> {
    return ImmutableMap(
      new globalThis.Map(handlers.map((h) => [h.tag, new Stack(h)])),
    ) as HandlerMap<Handler.EffectsOf<Handlers[number]>>
  }

  export namespace HandlerMap {
    export const Empty = HandlerMap<never>()
  }

  export interface GetEffectRefs {
    readonly tag: 'GetEffectRefs'
    readonly __trace?: string
  }

  export function GetEffectRefs(__trace?: string): Effect<never, never, EffectRefs> {
    return { tag: 'GetEffectRefs', __trace }
  }

  export interface EffectRefLocally<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, B> {
    readonly tag: 'EffectRefLocally'
    readonly effect: Effect<Fx, E, A>
    readonly ref: EffectRef<Fx2, E2, B>
    readonly value: B
    readonly __trace?: string
  }

  export function EffectRefLocally<Fx extends AnyIO, E, A, Fx2 extends AnyIO, E2, B>(
    effect: Effect<Fx, E, A>,
    ref: EffectRef<Fx2, E2, B>,
    value: B,
    __trace?: string,
  ): Effect<Fx, E, A> {
    return { tag: 'EffectRefLocally', effect, ref, value, __trace }
  }

  export interface GetTrace {
    readonly tag: 'GetTrace'
    readonly __trace?: string
  }

  export function GetTrace(__trace?: string): Effect<never, never, StackTrace> {
    return { tag: 'GetTrace', __trace }
  }

  export interface AddTrace<Fx extends AnyIO, E, A> {
    readonly tag: 'AddTrace'
    readonly effect: Effect<Fx, E, A>
    readonly trace: Trace
    readonly __trace?: string
  }

  export function AddTrace<Fx extends AnyIO, E, A>(
    effect: Effect<Fx, E, A>,
    trace: Trace,
  ): Effect<Fx, E, A> {
    return { tag: 'AddTrace', effect, trace }
  }

  export interface GetInterruptStatus {
    readonly tag: 'GetInterruptStatus'
    readonly __trace?: string
  }

  export function GetInterruptStatus(__trace?: string): Effect<never, never, boolean> {
    return { tag: 'GetInterruptStatus', __trace }
  }

  export interface SetInterruptStatus<Fx extends AnyIO, E, A> {
    readonly tag: 'SetInterruptStatus'
    readonly effect: Effect<Fx, E, A>
    readonly interruptStatus: boolean
    readonly __trace?: string
  }

  export function SetInterruptStatus<Fx extends AnyIO, E, A>(
    effect: Effect<Fx, E, A>,
    interruptStatus: boolean,
    __trace?: string,
  ): Effect<Fx, E, A> {
    return { tag: 'SetInterruptStatus', effect, interruptStatus, __trace }
  }

  export interface GetFiberId {
    readonly tag: 'GetFiberId'
    readonly __trace?: string
  }

  export function GetFiberId(__trace?: string): Effect<never, never, FiberId.Live> {
    return { tag: 'GetFiberId', __trace }
  }

  export interface GetFiberChildren {
    readonly tag: 'GetFiberChildren'
    readonly __trace?: string
  }

  export function GetFiberChildren(
    __trace?: string,
  ): Effect<never, never, ReadonlyArray<Fiber<any, any>>> {
    return { tag: 'GetFiberChildren', __trace }
  }

  export interface GetPlatform {
    readonly tag: 'GetPlatform'
    readonly __trace?: string
  }

  export function GetPlatform(__trace?: string): Effect<never, never, Platform> {
    return { tag: 'GetPlatform', __trace }
  }

  // #endregion
}

export const instr = Effect.instr
