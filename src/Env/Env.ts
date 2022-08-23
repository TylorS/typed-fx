import { Associative } from 'hkt-ts/Typeclass/Associative'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import { PROVIDEABLE, Provideable } from '@/Provideable/index.js'
import * as Service from '@/Service/Service.js'

export interface Env<R> extends Provideable<R> {
  readonly getAll: () => ReadonlyArray<readonly [Service.Service<R>, R]>
  readonly get: <S extends R>(service: Service.Service<S>) => S
  readonly add: <S>(
    service: Service.Service<S>,
    impl: Service.OutputOf<typeof service>,
  ) => Env<R | S>
}

export function Env<A, I extends A>(service: Service.Service<A>, implementation: I): Env<A> {
  return new Environment<A>(new Map<any, any>([[service, implementation]]))
}

export class Environment<R> implements Env<R> {
  readonly [PROVIDEABLE]: Env<R>[PROVIDEABLE]

  constructor(readonly services: Map<Service.Service<any>, any> = new Map()) {
    this[PROVIDEABLE] = () => this
  }

  readonly getAll: Env<R>['getAll'] = () => Array.from(this.services)

  readonly get = <S extends R>(s: Service.Service<S>): S => {
    if (this.services.has(s)) {
      return this.services.get(s) as S
    }

    throw new Error(
      `Unable to find an implementation or Layer for Service: ${Service.formatService(s)}`,
    )
  }

  readonly add: Env<R>['add'] = <S, I extends S>(
    service: Service.Service<S>,
    implementation: I,
  ): Env<R | S> =>
    new Environment<R | S>(new Map([...this.services, [service, implementation as S]]))
}

Env.empty = new Environment<never>() as Env<never>

export const makeAssociative = <A>(): Associative<Env<A>> => ({
  concat: (f, s) => (s as Environment<any>).getAll().reduce((a, [s, i]) => a.add(s, i), f),
})

export const makeIdentity = <A>(): Identity<Env<A>> => ({
  ...makeAssociative<A>(),
  id: Env.empty as Env<A>,
})
