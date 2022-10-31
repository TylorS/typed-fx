import * as Effect from '@effect/core/io/Effect'
import * as Maybe from '@tsplus/stdlib/data/Maybe'
import { Cause } from 'node_modules/@effect/core/io/Cause.js'
import { pipe } from 'node_modules/@fp-ts/data/Function.js'
import { LazyArg } from 'node_modules/@tsplus/stdlib/data/Function.js'

import { Fx } from './Fx.js'
import { never } from './fromEffect.js'
import { Hold } from './hold.js'
import { Multicast } from './multicast.js'

export interface Subject<E, A> extends SubjectEmitter<E, A>, Fx<never, E, A> {}

export interface SubjectEmitter<E, A> {
  readonly emit: (a: A) => void
  readonly failCause: (cause: Cause<E>) => void
  readonly end: () => void
}

export namespace Subject {
  export const unsafeMake = <E, A>(): Subject<E, A> => {
    const m = new Multicast<never, E, A>(never)

    return {
      run: m.run.bind(m),
      emit: (a) => Effect.unsafeRunAsync(m.emit(a)),
      failCause: (c) => Effect.unsafeRunAsync(m.failCause(c)),
      end: () => Effect.unsafeRunAsync(m.end),
    } as Subject<E, A>
  }
}

export interface HoldSubject<E, A> extends Subject<E, A> {
  readonly get: Effect.Effect<never, never, Maybe.Maybe<A>>
}

export namespace HoldSubject {
  export const unsafeMake = <E, A>(): HoldSubject<E, A> => {
    const h = new Hold<never, E, A>(never)

    return {
      run: h.run.bind(h),
      get: h.get,
      emit: (a) => Effect.unsafeRunAsync(h.emit(a)),
      failCause: (c) => Effect.unsafeRunAsync(h.failCause(c)),
      end: () => Effect.unsafeRunAsync(h.end),
    } as HoldSubject<E, A>
  }
}

export interface BehaviorSubject<E, A> extends Subject<E, A> {
  readonly get: Effect.Effect<never, never, A>
}

export namespace BehaviorSubject {
  export const unsafeMake = <E, A>(initial: LazyArg<A>): BehaviorSubject<E, A> => {
    const h = new Hold<never, E, A>(never)

    // We're mutating a protected variable here to ensure an initial value is held.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    h._value = Maybe.some(initial())

    return {
      run: h.run.bind(h),
      get: pipe(h.get, Effect.map(Maybe.getOrElse(initial))),
      emit: (a) => Effect.unsafeRunAsync(h.emit(a)),
      failCause: (c) => Effect.unsafeRunAsync(h.failCause(c)),
      end: () => Effect.unsafeRunAsync(h.end),
    } as BehaviorSubject<E, A>
  }
}
