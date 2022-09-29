import { Maybe, absurd, pipe, second } from 'hkt-ts'

import { Fx } from './Fx.js'
import { fromLazy } from './constructors.js'

import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Service } from '@/Service/Service.js'

export interface Env<R> {
  readonly services: ImmutableMap<Service<any>, any>
  readonly get: <S extends R>(service: Service<S>) => Fx.Of<S>
  readonly add: <S>(service: Service<S>, impl: S) => Env<R | S>
  readonly join: <S>(other: Env<S>) => Env<R | S>
}

export function Environment<R = never>(
  services: ImmutableMap<Service<any>, R> = ImmutableMap(),
): Env<R> {
  return {
    services,
    get: <S extends R>(service: Service<S>) =>
      fromLazy(() => pipe(services.get(service) as Maybe.Maybe<S>, Maybe.getOrElse<S>(absurd))),
    add: <S>(service: Service<S>, impl: S) => Environment<R | S>(services.set(service, impl)),
    join: <S>(other: Env<S>) => Environment<R | S>(services.joinWith(other.services, second)),
  }
}

export const Empty = Environment()

export function Env<S>(service: Service<S>, impl: S): Env<S> {
  return Environment().add(service, impl)
}

Env.empty = Empty
