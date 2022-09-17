import * as F from 'hkt-ts/function'

import * as C from '@/Cause/index.js'
import { Cause } from '@/Cause/index.js'
import { Exit } from '@/Exit/Exit.js'

// TODO: Track yields as a Tuple?
// TODO: Track Return HKTs?

export abstract class EffectBrand<R, E, A> {
  readonly __EFFECT__!: {
    readonly _R: () => R
    readonly _E: () => E
    readonly _A: () => A
  }
}

export abstract class Instr<out I, out R, out E, out A> extends EffectBrand<R, E, A> {
  static tag: string
  abstract readonly tag: string

  constructor(readonly input: I, readonly __trace?: string) {
    super()
  }

  *[Symbol.iterator](): Generator<this, A, any> {
    return yield this
  }
}

export const instr = <Tag extends string>(tag: Tag) =>
  class Instruction<I, R, E, A> extends Instr<I, R, E, A> {
    static tag: Tag = tag
    readonly tag: Tag = tag
  }

/* eslint-disable @typescript-eslint/no-unused-vars */
export type YieldOf<T> = T extends EffectBrand<infer _R, infer _E, infer _A> ? _R : never
export type ErrorsOf<T> = T extends EffectBrand<infer _R, infer _E, infer _A> ? _E : never
export type OutputOf<T> = T extends EffectBrand<infer _R, infer _E, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export type Effect<R, E, A> =
  // Constructors
  | Now<A>
  | FromLazy<A>
  | FromCause<E>
  | LazyEffect<R, E, A>
  // Control Flow
  | MapEffect<R, E, any, A>
  | FlatMapEffect<R, E, any, R, E, A>
  | OrElseEffect<R, any, A, R, E, A>
  | EnsuringEffect<R, any, any, R, E, A>
  | YieldNow
  // Efeccts
  | YieldEffect<R>

export class Now<A> extends instr('Now')<A, never, never, A> {}

export class FromLazy<A> extends instr('FromLazy')<F.Lazy<A>, never, never, A> {}

export class FromCause<E> extends instr('FromCause')<C.Cause<E>, never, E, never> {}

export class LazyEffect<R, E, A> extends instr('LazyEffect')<F.Lazy<Effect<R, E, A>>, R, E, A> {}

export class MapEffect<R, E, A, B> extends instr('MapEffect')<
  readonly [Effect<R, E, A>, (a: A) => B],
  R,
  E,
  B
> {}

export class FlatMapEffect<R, E, A, R2, E2, B> extends instr('FlatMapEffect')<
  readonly [Effect<R, E, A>, (a: A) => Effect<R2, E2, B>],
  R | R2,
  E | E2,
  B
> {}

export class OrElseEffect<R, E, A, R2, E2, B> extends instr('OrElseEffect')<
  readonly [Effect<R, E, A>, (cause: Cause<E>) => Effect<R2, E2, B>],
  R | R2,
  E2,
  A | B
> {}

export class EnsuringEffect<R, E, A, R2, E2, B> extends instr('Ensuring')<
  readonly [Effect<R, E, A>, (cause: Exit<E, A>) => Effect<R2, E2, B>],
  R | R2,
  E2,
  B
> {}

export class YieldNow extends instr('YieldNow')<never, never, never, void> {}

export class YieldEffect<R> extends instr('YieldEffect')<
  R,
  R | YieldOf<R>,
  ErrorsOf<R>,
  OutputOf<R>
> {}

// TODO: ProvideHandler + Handler
// TODO: GetHandlers - Use HKT to track return values?
// TODO: StackMap + References
// TODO: Interrupts
// TODO: Tracing
// TODO: Supervision
// TODO: Multiple Resumes
