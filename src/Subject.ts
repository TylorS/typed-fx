import * as Effect from '@effect/core/io/Effect'
import * as Maybe from '@tsplus/stdlib/data/Maybe'
import { pipe } from 'node_modules/@fp-ts/data/Function.js'
import { LazyArg } from 'node_modules/@tsplus/stdlib/data/Function.js'

import { Emitter, Fx } from './Fx.js'
import { never } from './fromEffect.js'
import { Hold } from './hold.js'
import { Multicast } from './multicast.js'

export interface Subject<E, A> extends Emitter<never, E, A>, Fx<never, E, A> {}

export namespace Subject {
  export const unsafeMake = <E, A>(): Subject<E, A> => new Multicast<never, E, A>(never)
}

export interface HoldSubject<E, A> extends Subject<E, A> {
  readonly get: Effect.Effect<never, never, Maybe.Maybe<A>>
}

export namespace HoldSubject {
  export const unsafeMake = <E, A>(): HoldSubject<E, A> => new Hold<never, E, A>(never)
}

export interface BehaviorSubject<E, A> extends Subject<E, A> {
  readonly get: Effect.Effect<never, never, A>
}

export namespace BehaviorSubject {
  export const unsafeMake = <E, A>(initial: LazyArg<A>): BehaviorSubject<E, A> => {
    const hold = new Hold<never, E, A>(never)

    // We're mutating a protected variable here to ensure an initial value is held.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    hold._value = Maybe.some(initial())

    return {
      emit: hold.emit.bind(hold),
      failCause: hold.failCause.bind(hold),
      end: hold.end,
      run: hold.run.bind(hold),
      get: pipe(hold.get, Effect.map(Maybe.getOrElse(initial))),
    }
  }
}
