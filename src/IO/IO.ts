import * as Either from 'hkt-ts/Either'
import { Lazy, flow } from 'hkt-ts/function'

import type { IOFuture } from './IOFuture.js'
import type { IORefs } from './IORefs.js'

import type { Cause } from '@/Cause/Cause.js'
import type { Exit } from '@/Exit/Exit.js'

export type IO<E, A> =
  | Now<A>
  | FromLazy<A>
  | FromCause<E>
  | LazyIO<E, A>
  | MapIO<E, any, A>
  | FlatMapIO<E, any, E, A>
  | OrElseIO<any, A, E, A>
  | AttemptIO<any, any, E, A>
  | GetIORefs
  | WaitIO<E, A>

export abstract class Instr<out I, out E, out A> {
  readonly __IO__!: {
    readonly _E: () => E
    readonly _A: () => A
  }

  constructor(readonly input: I, readonly __trace?: string) {}

  *[Symbol.iterator](): Generator<this, A, A> {
    return yield this
  }
}

export const instr = <Tag extends string>(tag: Tag) =>
  class Instruction<I, E, A> extends Instr<I, E, A> {
    static tag: Tag = tag
    readonly tag: Tag = tag
  }

// #region Intrinstics

/**
 * All IO's intrinsically have a access to the current IORefs. The IORefs
 * are not really type-safe in anyway, but this is a universal way to build
 * Fibers that compose atop of IO.
 */
export class GetIORefs extends instr('GetIORefs')<void, never, IORefs> {
  static make(): IO<never, IORefs> {
    return new GetIORefs()
  }
}

// #endregion Intrinstics

// #region Constructors

/**
 * Synchronously return a value.
 */
export class Now<out A> extends instr('Now')<A, never, A> {
  static make<A>(a: A, __trace?: string): IO<never, A> {
    return new Now(a, __trace)
  }
}

/**
 * Synchronously compute a value.
 */
export class FromLazy<out A> extends instr('FromLazy')<Lazy<A>, never, A> {
  static make<A>(lazy: Lazy<A>, __trace?: string): IO<never, A> {
    return new FromLazy(lazy, __trace)
  }
}

/**
 * Fail with a specific Cause
 */
export class FromCause<out E> extends instr('FromCause')<Cause<E>, E, never> {
  static make<E>(cause: Cause<E>, __trace?: string): IO<E, never> {
    return new FromCause(cause, __trace)
  }
}

/**
 * Lazily construct an IO. Useful for wrapping around "this" contexts
 */
export class LazyIO<out E, out A> extends instr('LazyIO')<Lazy<IO<E, A>>, E, A> {
  static make<E, A>(lazy: Lazy<IO<E, A>>, __trace?: string): IO<E, A> {
    return new LazyIO(lazy, __trace)
  }
}

// #endregion Constructors

// #region Control Flow

/**
 * Transform the output value of an IO
 */
export class MapIO<out E, in out A, out B> extends instr('MapIO')<
  readonly [io: IO<E, A>, f: (a: A) => B],
  E,
  B
> {
  static make<E, A, B>(io: IO<E, A>, f: (a: A) => B, __trace?: string): IO<E, B> {
    /**
     * Compose 2 mapped IO's together
     */
    if (io.tag === MapIO.tag) {
      return MapIO.make(io.input[0], flow(io.input[1], f), __trace)
    }

    // Removes 1 IOFrame from the immediate stack, attempting to perform
    // IOFrame optimizations on the resulting IO.
    if (io.tag === FlatMapIO.tag) {
      return FlatMapIO.make(io.input[0], (a) => MapIO.make(io.input[1](a), f, __trace), io.__trace)
    }

    return new MapIO([io, f], __trace)
  }
}

/**
 * Compute a new IO from the output of another IO
 */
export class FlatMapIO<out E, in out A, out E2, out B> extends instr('FlatMapIO')<
  readonly [io: IO<E, A>, f: (a: A) => IO<E2, B>],
  E | E2,
  B
> {
  static make<E, A, E2, B>(io: IO<E, A>, f: (a: A) => IO<E2, B>, __trace?: string): IO<E | E2, B> {
    // FlatMap cannot handle FromCause instructions
    if (io.tag === FromCause.tag) {
      return io
    }

    // Removes 1 IOFrame from the stack
    if (io.tag === MapIO.tag) {
      return FlatMapIO.make(io.input[0], flow(io.input[1], f), __trace)
    }

    return new FlatMapIO([io, f], __trace)
  }
}

/**
 * Respond to failures occuring within an IO
 */
export class OrElseIO<in out E, out A, out E2, out B> extends instr('OrElseIO')<
  readonly [io: IO<E, A>, f: (cause: Cause<E>) => IO<E2, B>],
  E,
  A | B
> {
  static make<E, A, E2, B>(
    io: IO<E, A>,
    f: (cause: Cause<E>) => IO<E2, B>,
    __trace?: string,
  ): IO<E2, A | B> {
    // Removes 1 IOFrame from the stack since it cannot fail
    if (io.tag === Now.tag) {
      return io
    }

    // Removes 1 IOFrame from the stack in favor of pattern matching over the exit value.
    if (io.tag === FlatMapIO.tag) {
      return AttemptIO.make(io.input[0], Either.match(f, io.input[1] as any), __trace)
    }

    return new OrElseIO([io, f], __trace)
  }
}

/**
 * Respond to the Exit value of an IO
 */
export class AttemptIO<in out E, in out A, out E2, out B> extends instr('AttemptIO')<
  readonly [io: IO<E, A>, f: (exit: Exit<E, A>) => IO<E2, B>],
  E2 | E2,
  B
> {
  static make<E, A, E2, B>(
    io: IO<E, A>,
    f: (exit: Exit<E, A>) => IO<E2, B>,
    __trace?: string,
  ): IO<E2, B> {
    return new AttemptIO([io, f], __trace)
  }
}

// #endregion Control Flow

// #region Async

/**
 * Utilize IOFuture to handle asynchony.
 */
export class WaitIO<E, A> extends instr('WaitIO')<
  IOFuture<any, any> /* Typed as any to avoid changing the variance of E + A in IO */,
  E,
  A
> {
  static make = <E, A>(future: IOFuture<E, A>, __trace?: string): IO<E, A> => {
    const state = future.state.get()

    if (state.tag === 'Resolved') {
      return state.io
    }

    return new WaitIO<E, A>(future, __trace)
  }
}
// #endregion
