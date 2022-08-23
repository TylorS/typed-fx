import { Either, Right } from 'hkt-ts/Either'
import { Lazy, flow } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import type { Fx } from './Fx.js'

import { Cause } from '@/Cause/Cause.js'
import { Env } from '@/Env/Env.js'
import { Exit } from '@/Exit/Exit.js'
import type { Live } from '@/Fiber/Fiber.js'
import type { FiberContext } from '@/FiberContext/FiberContext.js'
import type { FiberRef } from '@/FiberRef/FiberRef.js'
import type { Future } from '@/Future/index.js'
import { Trace } from '@/Trace/Trace.js'

export type Instruction<R, E, A> =
  | Access<R, R, E, A>
  | AddTrace<R, E, A>
  | BothFx<R, E, any, R, E, any>
  | EitherFx<R, E, any, R, E, any>
  | Ensuring<R, E, A, R, E, any>
  | FiberRefLocally<any, any, any, R, E, A>
  | FlatMap<R, E, any, R, E, A>
  | Fork<R, any, A>
  | Fork<R, never, A>
  | FromCause<E>
  | FromLazy<A>
  | GetFiberContext
  | GetFiberRef<R, E, A>
  | GetInterruptStatus
  | GetTrace
  | LazyFx<R, E, A>
  | MapFx<R, E, any, A>
  | Match<R, E, any, R, E, A, R, E, A>
  | ModifyFiberRef<R, E, any, A>
  | Now<A>
  | Provide<any, E, A>
  | Provide<never, E, A>
  | SetConcurrencyLevel<R, E, A>
  | SetInterruptStatus<R, E, A>
  | Wait<R, E, A>

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>

export abstract class Instr<out R, out E, out A> {
  readonly _R!: () => R
  readonly _E!: () => E
  readonly _A!: () => A

  readonly instr: this

  constructor(readonly __trace?: string) {
    this.instr = this
  }

  *[Symbol.iterator](): Generator<this, A, A> {
    return yield this
  }
}

export class Now<out A> extends Instr<never, never, A> {
  readonly tag = 'Now'
  constructor(readonly value: A, readonly __trace?: string) {
    super(__trace)
  }

  static make<A>(value: A, __trace?: string): Fx<never, never, A> {
    return new Now(value, __trace)
  }
}

export class FromLazy<out A> extends Instr<never, never, A> {
  readonly tag = 'FromLazy'
  constructor(readonly f: Lazy<A>, readonly __trace?: string) {
    super(__trace)
  }

  static make<A>(f: Lazy<A>, __trace?: string): Fx<never, never, A> {
    return new FromLazy(f, __trace)
  }
}

export class FromCause<out E> extends Instr<never, E, never> {
  readonly tag = 'FromCause'
  constructor(readonly cause: Cause<E>, readonly __trace?: string) {
    super(__trace)
  }

  static make<E>(cause: Cause<E>, __trace?: string): Fx<never, E, never> {
    return new FromCause(cause, __trace)
  }
}

export class MapFx<out R, out E, in out A, out B> extends Instr<R, E, B> {
  readonly tag = 'Map'

  constructor(readonly fx: Fx<R, E, A>, readonly f: (a: A) => B, readonly __trace?: string) {
    super(__trace)
  }

  static make<R, E, A, B>(fx: Fx<R, E, A>, f: (a: A) => B, __trace?: string): Fx<R, E, B> {
    const prev = fx as Instruction<R, E, A>

    if (prev.tag === 'Now') {
      return new Now(f(prev.value), __trace) as Fx<R, E, B>
    }

    if (prev.tag === 'Map') {
      return new MapFx(prev.fx as Fx<any, any, any>, flow(prev.f, f), __trace)
    }

    return new MapFx(fx, f, __trace)
  }
}

export class FlatMap<out R, out E, in out A, out R2, out E2, out B> extends Instr<
  R | R2,
  E | E2,
  B
> {
  readonly tag = 'FlatMap'

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly f: (a: A) => Fx<R2, E2, B>,
    readonly __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B>(
    fx: Fx<R, E, A>,
    f: (a: A) => Fx<R2, E2, B>,
    __trace?: string,
  ): Fx<R | R2, E | E2, B> {
    const prev = fx as Instruction<R, E, A>

    if (prev.tag === 'Now') {
      return f(prev.value) as Fx<R | R2, E | E2, B>
    }

    if (prev.tag === 'Map') {
      return new FlatMap(prev.fx as Fx<any, any, any>, flow(prev.f, f), __trace) as Fx<
        R | R2,
        E | E2,
        B
      >
    }

    return new FlatMap(fx, f, __trace) as Fx<R | R2, E | E2, B>
  }
}

export class Match<
  out R,
  in out E,
  in out A,
  out R2,
  out E2,
  out B,
  out R3,
  out E3,
  out C,
> extends Instr<R | R2 | R3, E2 | E3, B | C> {
  readonly tag = 'Match'

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly onLeft: (cause: Cause<E>) => Fx<R2, E2, B>,
    readonly onRight: (a: A) => Fx<R3, E3, C>,
    readonly __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B, R3, E3, C>(
    fx: Fx<R, E, A>,
    onLeft: (cause: Cause<E>) => Fx<R2, E2, B>,
    onRight: (a: A) => Fx<R3, E3, C>,
    __trace?: string,
  ): Fx<R | R2 | R3, E2 | E3, B | C> {
    const prev = fx as Instruction<R, E, A>

    if (prev.tag === 'Now') {
      return onRight(prev.value) as Fx<R | R2 | R3, E2 | E3, B | C>
    }

    if (prev.tag === 'FromCause') {
      return onLeft(prev.cause) as Fx<R | R2 | R3, E2 | E3, B | C>
    }

    if (prev.tag === 'Map') {
      return new Match(prev.fx as Fx<any, any, any>, onLeft, flow(prev.f, onRight), __trace) as any
    }

    return new Match(fx, onLeft, onRight, __trace) as any
  }
}

export class Ensuring<out R, in out E, in out A, out R2, out E2, out B> extends Instr<
  R | R2,
  E | E2,
  A
> {
  readonly tag = 'Ensuring'

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly ensure: (a: Exit<E, A>) => Fx<R2, E2, B>,
    readonly __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B>(
    fx: Fx<R, E, A>,
    ensure: (a: Exit<E, A>) => Fx<R2, E2, B>,
    __trace?: string,
  ): Fx<R | R2, E | E2, A> {
    const prev = fx as Instruction<R, E, A>

    if (prev.tag === 'Now') {
      return Match.make(
        ensure(Right(prev.value)),
        FromCause.make,
        () => Now.make(prev.value),
        __trace,
      ) as Fx<R | R2, E | E2, A>
    }

    return new Ensuring(fx, ensure, __trace) as Fx<R | R2, E | E2, A>
  }
}

export class Access<in out R, out R2, out E, out A> extends Instr<R | R2, E, A> {
  readonly tag = 'Access'

  constructor(readonly f: (r: Env<R>) => Fx<R2, E, A>, readonly __trace?: string) {
    super(__trace)
  }

  static make<R, R2, E, A>(f: (r: Env<R>) => Fx<R2, E, A>, __trace?: string): Fx<R | R2, E, A> {
    return new Access(f, __trace) as Fx<R | R2, E, A>
  }
}

export class Provide<out R, out E, out A> extends Instr<never, E, A> {
  readonly tag = 'Provide'

  constructor(readonly fx: Fx<R, E, A>, readonly env: Env<R>, readonly __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(fx: Fx<R, E, A>, env: Env<R>, __trace?: string): Fx<never, E, A> {
    return new Provide(fx, env, __trace) as Fx<never, E, A>
  }
}

export class LazyFx<out R, out E, out A> extends Instr<R, E, A> {
  readonly tag = 'Lazy'

  constructor(readonly f: () => Fx<R, E, A>, readonly __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(f: () => Fx<R, E, A>, __trace?: string): Fx<R, E, A> {
    return new LazyFx(f, __trace)
  }
}

export class Wait<in out R, in out E, in out A> extends Instr<R, E, A> {
  readonly tag = 'Wait'

  constructor(readonly future: Future<R, E, A>, readonly __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(future: Future<R, E, A>, __trace?: string): Fx<R, E, A> {
    return new Wait(future, __trace)
  }
}

export class AddTrace<out R, out E, out A> extends Instr<R, E, A> {
  readonly tag = 'AddTrace'

  constructor(readonly fx: Fx<R, E, A>, readonly trace: Trace) {
    super()
  }

  static make<R, E, A>(fx: Fx<R, E, A>, trace: Trace): Fx<R, E, A> {
    return new AddTrace(fx, trace)
  }
}

export class GetTrace extends Instr<never, never, Trace> {
  readonly tag = 'GetTrace'

  static make = (__trace?: string): Fx<never, never, Trace> => new GetTrace(__trace)
}

export class SetInterruptStatus<out R, out E, out A> extends Instr<R, E, A> {
  readonly tag = 'SetInterruptStatus'

  constructor(readonly fx: Fx<R, E, A>, readonly interruptStatus: boolean, __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(fx: Fx<R, E, A>, interruptStatus: boolean, __trace?: string): Fx<R, E, A> {
    return new SetInterruptStatus(fx, interruptStatus, __trace)
  }
}

export class GetFiberContext extends Instr<never, never, FiberContext> {
  readonly tag = 'GetFiberContext'

  static make = (__trace?: string): Fx<never, never, FiberContext> => new GetFiberContext(__trace)
}

export class GetInterruptStatus extends Instr<never, never, boolean> {
  readonly tag = 'GetInterruptStatus'

  static make = (__trace?: string): Fx<never, never, boolean> => new GetInterruptStatus(__trace)
}

export class SetConcurrencyLevel<out R, out E, out A> extends Instr<R, E, A> {
  readonly tag = 'SetConcurrencyLevel'

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly concurrencyLevel: NonNegativeInteger,
    __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A>(
    fx: Fx<R, E, A>,
    concurrencyLevel: NonNegativeInteger,
    __trace?: string,
  ): Fx<R, E, A> {
    return new SetConcurrencyLevel(fx, concurrencyLevel, __trace)
  }
}

export class GetFiberRef<out R, out E, in out A> extends Instr<R, E, A> {
  readonly tag = 'GetFiberRef'

  constructor(readonly fiberRef: FiberRef<R, E, A>, __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(fiberRef: FiberRef<R, E, A>, __trace?: string): Fx<R, E, A> {
    return new GetFiberRef(fiberRef, __trace)
  }
}

export class ModifyFiberRef<out R, out E, in out A, out B> extends Instr<R, E, B> {
  readonly tag = 'ModifyFiberRef'

  constructor(
    readonly fiberRef: FiberRef<R, E, A>,
    readonly modify: (a: A) => readonly [B, A],
    __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, B>(
    fiberRef: FiberRef<R, E, A>,
    modify: (a: A) => readonly [B, A],
    __trace?: string,
  ): Fx<R, E, B> {
    return new ModifyFiberRef(fiberRef, modify, __trace)
  }
}
export class FiberRefLocally<out R, out E, in out A, out R2, out E2, out B> extends Instr<
  R2,
  E2,
  B
> {
  readonly tag = 'FiberRefLocally'

  constructor(
    readonly fiberRef: FiberRef<R, E, A>,
    readonly value: A,
    readonly fx: Fx<R2, E2, B>,
    __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B>(
    fiberRef: FiberRef<R, E, A>,
    value: A,
    fx: Fx<R2, E2, B>,
    __trace?: string,
  ): Fx<R2, E2, B> {
    return new FiberRefLocally(fiberRef, value, fx, __trace)
  }
}

export class Fork<out R, in out E, in out A> extends Instr<R, never, Live<E, A>> {
  readonly tag = 'Fork'

  constructor(readonly fx: Fx<R, E, A>, readonly __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(fx: Fx<R, E, A>, __trace?: string): Fx<R, never, Live<E, A>> {
    return new Fork(fx, __trace) as any
  }
}

export class BothFx<out R, out E, out A, out R2, out E2, out B> extends Instr<
  R | R2,
  E | E2,
  readonly [A, B]
> {
  readonly tag = 'Both'

  constructor(
    readonly first: Fx<R, E, A>,
    readonly second: Fx<R2, E2, B>,
    readonly __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B>(
    first: Fx<R, E, A>,
    second: Fx<R2, E2, B>,
    __trace?: string,
  ): Fx<R | R2, E | E2, readonly [A, B]> {
    return new BothFx(first, second, __trace) as any
  }
}

export class EitherFx<out R, out E, out A, out R2, out E2, out B> extends Instr<
  R | R2,
  E | E2,
  Either<A, B>
> {
  readonly tag = 'Either'

  constructor(
    readonly first: Fx<R, E, A>,
    readonly second: Fx<R2, E2, B>,
    readonly __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B>(
    first: Fx<R, E, A>,
    second: Fx<R2, E2, B>,
    __trace?: string,
  ): Fx<R | R2, E | E2, Either<A, B>> {
    return new EitherFx(first, second, __trace) as any
  }
}
