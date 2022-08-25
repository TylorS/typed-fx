import { Associative } from 'hkt-ts/Typeclass/Associative'

// eslint-disable-next-line import/no-cycle
import { PROVIDEABLE, Provideable } from '@/Provideable/index.js'
import * as Service from '@/Service/Service.js'

export interface Env<R> extends Provideable<R> {
  readonly getAll: () => ReadonlyArray<readonly [Service.Service<R>, R]>

  readonly get: <S extends R>(service: Service.Service<S>) => S

  readonly add: <S>(
    service: Service.Service<S>,
    impl: Service.OutputOf<typeof service>,
  ) => Env<R | S>

  readonly provide: <S>(p: Provideable<S>) => Env<R | S>
}

export function Env<A, I extends A>(service: Service.Service<A>, implementation: I): Env<A> {
  return new Environment<A>(new Map<any, any>([[service, implementation]]))
}

export class Environment<R> extends Provideable<R> implements Env<R> {
  readonly [PROVIDEABLE]: Env<R>[PROVIDEABLE]

  readonly name = this.constructor.name

  constructor(readonly services: Map<Service.Service<any>, any> = new Map()) {
    super()
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

  readonly provide: Env<R>['provide'] = <S>(p: Provideable<S>): Env<R | S> =>
    concat(Provideable.get(p))(this)
}

Env.empty = new Environment<never>() as Env<never>

export const makeAssociative = <A>(): Associative<Env<A>> => ({
  concat: (f, s) => s.getAll().reduce((a, [s, i]) => a.add(s, i), f),
})

export const concat =
  <S>(second: Env<S>) =>
  <R>(first: Env<R>): Env<R | S> =>
    makeAssociative<R | S>().concat(first, second)
