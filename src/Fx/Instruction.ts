import { Either, Left, Right } from 'hkt-ts/Either'
import { Maybe } from 'hkt-ts/Maybe'
import { Lazy, flow } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import type { Fx } from './Fx.js'

import { Cause } from '@/Cause/Cause.js'
import type { Env } from '@/Env/Env.js'
import type { Live } from '@/Fiber/Fiber.js'
import type { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import type { FiberRef } from '@/FiberRef/FiberRef.js'
import type { Future } from '@/Future/index.js'
import { Trace } from '@/Trace/Trace.js'

export type Instruction<R, E, A> =
  | AddTrace<R, E, A>
  | BothFx<R, E, A>
  | DeleteFiberRef<R, E, A>
  | EitherFx<R, E, A>
  | FiberRefLocally<any, any, any, R, E, A>
  | FlatMap<R, E, any, R, E, A>
  | Fork<R, E, A>
  | FromCause<E>
  | FromLazy<A>
  | GetEnv<R, E, A>
  | GetFiberContext
  | GetFiberRef<R, E, A>
  | GetInterruptStatus
  | GetTrace
  | LazyFx<R, E, A>
  | MapFx<R, E, any, A>
  | Match<R, any, any, R, E, A, R, E, A>
  | ModifyFiberRef<R, E, any, R, E, A>
  | Now<A>
  | Provide<any, E, A>
  | SetConcurrencyLevel<R, E, A>
  | SetInterruptStatus<R, E, A>
  | Wait<R, E, A>

export type AnyInstruction = Instruction<any, any, any>

export abstract class Instr<out R, out E, out A> {
  readonly _R!: () => R
  readonly _E!: () => E
  readonly _A!: () => A

  readonly instr: this

  constructor(readonly __trace?: string) {
    this.instr = this
  }

  *[Symbol.iterator](): Generator<this, A, any> {
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
    const prev = fx.instr

    // Eagerly evaluate the function to runtime cost. Stack unsafe.
    if (prev.tag === 'Now') {
      return Now.make(f(prev.value), __trace)
    }

    // Map cannot process failures
    if (prev.tag === 'FromCause') {
      return prev
    }

    // Fuse together multiple maps.
    if (prev.tag === 'Map') {
      return MapFx.make(prev.fx, flow(prev.f, f), __trace)
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
    readonly fx: Fx<any, any, any>,
    readonly f: (a: A) => Fx<any, any, any>,
    readonly __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B>(
    fx: Fx<R, E, A>,
    f: (a: A) => Fx<R2, E2, B>,
    __trace?: string,
  ): Fx<R | R2, E | E2, B> {
    const prev = fx.instr

    // Flatmap cannot process failures
    if (prev.tag === 'FromCause') {
      return prev
    }

    // Fuse together Map + FlatMap into a single FlatMap.
    if (prev.tag === 'Map') {
      return FlatMap.make(prev.fx, flow(prev.f, f), __trace)
    }

    return new FlatMap(fx, f, __trace)
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
    readonly fx: Fx<any, any, any>,
    readonly onLeft: (cause: Cause<E>) => Fx<any, any, any>,
    readonly onRight: (a: A) => Fx<any, any, any>,
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
    const prev = fx.instr

    // Fuse together Map + Match
    if (prev.tag === 'Map') {
      return Match.make(prev.fx, onLeft, flow(prev.f, onRight), __trace)
    }

    return new Match(fx, onLeft, onRight, __trace)
  }
}

export class GetEnv<out R, out E, out A> extends Instr<R, E, A> {
  readonly tag = 'GetEnv'

  static make<R>(__trace?: string): Fx<R, never, Env<R>> {
    return new GetEnv<R, never, Env<R>>(__trace)
  }
}

export class Provide<out R, out E, out A> extends Instr<never, E, A> {
  readonly tag = 'Provide'

  constructor(readonly fx: Fx<any, any, any>, readonly env: Env<R>, readonly __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(fx: Fx<R, E, A>, env: Env<R>, __trace?: string): Fx<never, E, A> {
    return new Provide(fx, env, __trace)
  }
}

export class LazyFx<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'Lazy'

  constructor(readonly f: () => Fx<any, any, any>, readonly __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(f: () => Fx<R, E, A>, __trace?: string): Fx<R, E, A> {
    return new LazyFx(f, __trace)
  }
}

export class Wait<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'Wait'

  constructor(readonly future: Future<any, any, any>, readonly __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(future: Future<R, E, A>, __trace?: string): Fx<R, E, A> {
    return new Wait(future, __trace)
  }
}

export class AddTrace<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'AddTrace'

  constructor(readonly fx: Fx<any, any, any>, readonly trace: Trace) {
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

export class SetInterruptStatus<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'SetInterruptStatus'

  constructor(readonly fx: Fx<any, any, any>, readonly interruptStatus: boolean, __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(fx: Fx<R, E, A>, interruptStatus: boolean, __trace?: string): Fx<R, E, A> {
    return new SetInterruptStatus(fx, interruptStatus, __trace)
  }
}

export class GetFiberContext extends Instr<never, never, FiberContext<FiberId.Live>> {
  readonly tag = 'GetFiberContext'

  static make = (__trace?: string): Fx<never, never, FiberContext<FiberId.Live>> =>
    new GetFiberContext(__trace)
}

export class GetInterruptStatus extends Instr<never, never, boolean> {
  readonly tag = 'GetInterruptStatus'

  static make = (__trace?: string): Fx<never, never, boolean> => new GetInterruptStatus(__trace)
}

export class SetConcurrencyLevel<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'SetConcurrencyLevel'

  constructor(
    readonly fx: Fx<any, any, any>,
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

export class GetFiberRef<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'GetFiberRef'

  constructor(readonly fiberRef: FiberRef<any, any, any>, __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(fiberRef: FiberRef<R, E, A>, __trace?: string): Fx<R, E, A> {
    return new GetFiberRef(fiberRef, __trace)
  }
}

export class ModifyFiberRef<R, E, A, R2, E2, B> extends Instr<R | R2, E | E2, B> {
  readonly tag = 'ModifyFiberRef'

  constructor(
    readonly fiberRef: FiberRef<any, any, any>,
    readonly modify: (a: A) => Fx<R2, E2, readonly [B, A]>,
    __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B>(
    fiberRef: FiberRef<R, E, A>,
    modify: (a: A) => Fx<R2, E2, readonly [B, A]>,
    __trace?: string,
  ): Fx<R | R2, E | E2, B> {
    return new ModifyFiberRef(fiberRef, modify, __trace)
  }
}

export class DeleteFiberRef<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'DeleteFiberRef'

  constructor(readonly fiberRef: FiberRef<any, any, any>, __trace?: string) {
    super(__trace)
  }

  static make<R, E, A>(fiberRef: FiberRef<R, E, A>, __trace?: string): Fx<R, E, Maybe<A>> {
    return new DeleteFiberRef(fiberRef, __trace)
  }
}

export class FiberRefLocally<R, E, A, R2, E2, B> extends Instr<R2, E2, B> {
  readonly tag = 'FiberRefLocally'

  constructor(
    readonly fiberRef: FiberRef<R, E, A>,
    readonly value: A,
    readonly fx: Fx<any, any, any>,
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

export class Fork<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'Fork'

  constructor(
    readonly fx: Fx<any, any, any>,
    readonly context: FiberContext<FiberId.Live>,
    readonly async: boolean = true,
    readonly __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A>(
    fx: Fx<R, E, A>,
    context: FiberContext<FiberId.Live>,
    async = true,
    __trace?: string,
  ): Fx<R, never, Live<E, A>> {
    return new Fork(fx, context, async, __trace)
  }
}

export class BothFx<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'Both'

  constructor(
    readonly first: Fx<any, any, any>,
    readonly second: Fx<any, any, any>,
    readonly __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B>(
    first: Fx<R, E, A>,
    second: Fx<R2, E2, B>,
    __trace?: string,
  ): Fx<R | R2, E | E2, readonly [A, B]> {
    // Any Failures cannot be combined into a tuple of success values
    if (first.instr.tag === 'FromCause') {
      return first.instr
    }
    if (second.instr.tag === 'FromCause') {
      return second.instr
    }

    return new BothFx(first, second, __trace)
  }
}

export class EitherFx<R, E, A> extends Instr<R, E, A> {
  readonly tag = 'Either'

  constructor(
    readonly first: Fx<any, any, any>,
    readonly second: Fx<any, any, any>,
    readonly __trace?: string,
  ) {
    super(__trace)
  }

  static make<R, E, A, R2, E2, B>(
    first: Fx<R, E, A>,
    second: Fx<R2, E2, B>,
    __trace?: string,
  ): Fx<R | R2, E | E2, Either<A, B>> {
    const fi = first.instr

    if (fi.tag === 'Now') {
      return Now.make(Left(fi.value), __trace)
    }

    const si = second.instr

    if (si.tag === 'Now') {
      return Now.make(Right(si.value), __trace)
    }

    if (fi.tag === 'FromCause') {
      return fi
    }

    if (si.tag === 'FromCause') {
      return si
    }

    return new EitherFx(first, second, __trace)
  }
}
