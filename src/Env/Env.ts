import { pipe, second } from 'hkt-ts'
import { Maybe, getOrElse } from 'hkt-ts/Maybe'
import { Associative } from 'hkt-ts/Typeclass/Associative'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { OutputOf, Service } from '@/Service/Service.js'

export interface Env<R> extends Iterable<readonly [Service<any>, any]> {
  readonly services: ImmutableMap<Service<any>, any>
  readonly get: <S extends R>(service: Service<S>) => S
  readonly getMany: <S extends ReadonlyArray<Service<R>>>(
    ...services: S
  ) => { readonly [K in keyof S]: OutputOf<S[K]> }
  readonly add: <S>(service: Service<S>, impl: S) => Env<R | S>
  readonly join: <S>(other: Env<S>) => Env<R | S>
  readonly prune: <S extends ReadonlyArray<Service<R>>>(...services: S) => Env<OutputOf<S[number]>>
}

export const Empty = Environment<never>(ImmutableMap())

export function Env<R>(service: Service<R>, impl: R): Env<R> {
  return Empty.add(service, impl)
}

export function Environment<R>(services: ImmutableMap<Service<any>, R>): Env<R> {
  const get = <S>(s: Service<S>) =>
    pipe(
      services.get(s) as Maybe<S>,
      getOrElse(() => {
        throw new Error(`Unable to find Service ${s.description}`)
      }),
    )

  return {
    [Symbol.iterator]: () => services[Symbol.iterator](),
    services,
    get,
    getMany: ((...ss) => ss.map(get)) as Env<R>['getMany'],
    add: (s, i) => Environment(services.set(s, i)),
    join: (other) => Environment(services.joinWith(other.services, second)),
    prune: (...ss) => Environment(services.prune((s) => ss.includes(s))),
  }
}

export const concat = <A, B>(a: Env<A>, b: Env<B>): Env<A | B> => a.join(b)

export const makeAssociative = <A>(): Associative<Env<A>> => ({
  concat,
})

export const makeIdentity = <A>(): Identity<Env<A>> => ({
  ...makeAssociative<A>(),
  id: Empty,
})
